/**
 * FigDex production load smoke test
 *
 * Purpose:
 * - run a controlled read-heavy smoke load against production
 * - monitor key API routes in parallel with lightweight Supabase probes
 * - compare response time regressions after performance changes
 *
 * Usage:
 *   node web/scripts/prod-load-smoke.js
 *
 * Optional env:
 *   PROD_BASE_URL
 *   LOAD_DURATION_MS
 *   LOAD_CONCURRENCY
 *   MONITOR_INTERVAL_MS
 *   LOAD_TEST_EMAIL
 *
 * Notes:
 * - reads credentials from web/.env.local
 * - intended for controlled founder-led production checks, not destructive load
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

function loadEnv(envPath) {
  const raw = fs.readFileSync(envPath, 'utf8');
  const entries = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    });
  return Object.fromEntries(entries);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function timed(label, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return { ok: true, label, ms: Date.now() - startedAt, result };
  } catch (error) {
    return {
      ok: false,
      label,
      ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    body = { raw: text.slice(0, 300) };
  }
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', '.env.local'));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const baseUrl = process.env.PROD_BASE_URL || 'https://www.figdex.com';
  const durationMs = Number(process.env.LOAD_DURATION_MS || 30000);
  const concurrency = Number(process.env.LOAD_CONCURRENCY || 12);
  const monitorIntervalMs = Number(process.env.MONITOR_INTERVAL_MS || 2500);
  const testEmail = process.env.LOAD_TEST_EMAIL || 'ran.mor@wisdo.com';

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id,email,api_key')
    .eq('email', testEmail)
    .maybeSingle();

  if (userError || !user || !user.api_key) {
    throw new Error(`Could not resolve test user/api key for ${testEmail}: ${userError ? userError.message : 'missing api_key'}`);
  }

  const { data: file } = await supabase
    .from('indexed_files')
    .select('id,file_name')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!file) {
    throw new Error(`No indexed_files row found for ${testEmail}`);
  }

  const { data: page } = await supabase
    .from('indexed_pages')
    .select('id,figma_page_id,page_name')
    .eq('file_id', file.id)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!page) {
    throw new Error(`No indexed_pages row found for latest file ${file.id}`);
  }

  const { data: shareRows } = await supabase
    .from('shared_views')
    .select('share_token,share_type')
    .order('created_at', { ascending: false })
    .limit(1);

  const latestShare = Array.isArray(shareRows) && shareRows[0] ? shareRows[0] : null;
  const authHeaders = {
    Authorization: `Bearer ${user.api_key}`,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    {
      name: 'get-indices',
      run: () => fetchJson(`${baseUrl}/api/get-indices?userEmail=${encodeURIComponent(testEmail)}`, { headers: authHeaders }),
    },
    {
      name: 'file-summary',
      run: () =>
        fetchJson(
          `${baseUrl}/api/file-index-view?mode=summary&indexId=${encodeURIComponent(file.id)}`,
          { headers: authHeaders }
        ),
    },
    {
      name: 'file-page',
      run: () =>
        fetchJson(
          `${baseUrl}/api/file-index-view?mode=page&indexId=${encodeURIComponent(file.id)}&pageId=${encodeURIComponent(page.figma_page_id)}&offset=0&limit=24`,
          { headers: authHeaders }
        ),
    },
    {
      name: 'file-search',
      run: () =>
        fetchJson(
          `${baseUrl}/api/file-index-view?mode=search&indexId=${encodeURIComponent(file.id)}&q=${encodeURIComponent('month')}&offset=0&limit=24`,
          { headers: authHeaders }
        ),
    },
    {
      name: 'user-limits',
      run: () => fetchJson(`${baseUrl}/api/user/limits`, { headers: authHeaders }),
    },
  ];

  if (latestShare && latestShare.share_token) {
    endpoints.push({
      name: 'public-share',
      run: () =>
        fetchJson(
          `${baseUrl}/api/public/shared-view/${encodeURIComponent(latestShare.share_token)}`,
          {}
        ),
    });
  }

  console.log(JSON.stringify({
    type: 'setup',
    baseUrl,
    durationMs,
    concurrency,
    monitorIntervalMs,
    user: testEmail,
    fileId: file.id,
    pageId: page.id,
    figmaPageId: page.figma_page_id,
    shareToken: latestShare ? latestShare.share_token : null,
    endpoints: endpoints.map((e) => e.name),
  }, null, 2));

  const stopAt = Date.now() + durationMs;
  const results = [];
  const monitor = [];

  let monitorActive = true;
  const monitorLoop = (async () => {
    while (monitorActive) {
      const sample = await Promise.all([
        timed('db:indexed_files_count', async () => supabase.from('indexed_files').select('*', { count: 'exact', head: true })),
        timed('db:indexed_pages_count', async () => supabase.from('indexed_pages').select('*', { count: 'exact', head: true })),
        timed('db:indexed_frames_page', async () => supabase.from('indexed_frames').select('*', { count: 'exact', head: true }).eq('page_id', page.id)),
        timed('http:get-indices', async () => fetchJson(`${baseUrl}/api/get-indices?userEmail=${encodeURIComponent(testEmail)}`, { headers: authHeaders })),
      ]);
      monitor.push({
        at: new Date().toISOString(),
        samples: sample.map((entry) => ({
          label: entry.label,
          ok: entry.ok,
          ms: entry.ms,
          error: entry.error || null,
          status: entry.result && entry.result.status ? entry.result.status : null,
        })),
      });
      await sleep(monitorIntervalMs);
    }
  })();

  async function worker(workerId) {
    while (Date.now() < stopAt) {
      for (const endpoint of endpoints) {
        if (Date.now() >= stopAt) break;
        const startedAt = Date.now();
        try {
          const response = await endpoint.run();
          results.push({
            workerId,
            endpoint: endpoint.name,
            ok: response.ok,
            status: response.status,
            ms: Date.now() - startedAt,
            error: response.ok ? null : JSON.stringify(response.body).slice(0, 200),
          });
        } catch (error) {
          results.push({
            workerId,
            endpoint: endpoint.name,
            ok: false,
            status: null,
            ms: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, idx) => worker(idx + 1)));
  monitorActive = false;
  await monitorLoop;

  const grouped = {};
  for (const row of results) {
    if (!grouped[row.endpoint]) grouped[row.endpoint] = [];
    grouped[row.endpoint].push(row);
  }

  const summary = Object.fromEntries(
    Object.entries(grouped).map(([endpoint, rows]) => {
      const sorted = rows.map((r) => r.ms).sort((a, b) => a - b);
      const failures = rows.filter((r) => !r.ok);
      return [
        endpoint,
        {
          requests: rows.length,
          failures: failures.length,
          p50: percentile(sorted, 50),
          p95: percentile(sorted, 95),
          p99: percentile(sorted, 99),
          max: sorted.length ? sorted[sorted.length - 1] : null,
          sampleErrors: failures.slice(0, 5).map((f) => ({ status: f.status, error: f.error })),
        },
      ];
    })
  );

  console.log(JSON.stringify({
    type: 'result',
    durationMs,
    concurrency,
    summary,
    monitor,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
