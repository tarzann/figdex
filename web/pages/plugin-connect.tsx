import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function PluginConnect() {
  const router = useRouter();
  const { nonce, docId, claimToken, mode, anonId: anonIdQuery } = router.query;
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'connecting' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const claimTokenStr = typeof claimToken === 'string' ? claimToken.trim() : '';
    const nonceStr = typeof nonce === 'string' ? nonce : '';
    const modeStr = typeof mode === 'string' ? mode : '';
    const anonIdStr = typeof anonIdQuery === 'string' ? anonIdQuery.trim() : '';

    const run = async () => {
      try {
        if (modeStr === 'upgrade' && anonIdStr && !claimTokenStr) {
          setStatus('redirecting');
          try {
            const startRes = await fetch('/api/claim/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ anonId: anonIdStr, source: 'plugin_connect' }),
            });
            const startData = await startRes.json().catch(() => ({}));
            if (startRes.ok && startData.claimToken) {
              const returnUrl = `/plugin-connect?claimToken=${encodeURIComponent(startData.claimToken)}&nonce=${encodeURIComponent(nonceStr)}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
              window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
              return;
            }
          } catch (_) {}
          const returnUrl = `/plugin-connect?nonce=${encodeURIComponent(nonceStr)}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        let apiKey: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('figma_web_user');
            if (raw) {
              const data = JSON.parse(raw);
              const key = data?.api_key || null;
              if (key && String(key).trim().startsWith('figdex_')) apiKey = String(key).trim();
            }
          } catch (_) {}
        }

        if (claimTokenStr && apiKey) {
          setStatus('connecting');
          try {
            const claimRes = await fetch('/api/claim/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({ claimToken: claimTokenStr }),
            });
            const claimData = await claimRes.json().catch(() => ({}));
            if (claimRes.ok && claimData.ok && nonceStr) {
              const connectRes = await fetch('/api/plugin-connect/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ nonce: nonceStr }),
              });
              if (connectRes.ok) {
                setStatus('success');
                setMessage('Connected! You can close this window and return to Figma.');
                return;
              }
            }
          } catch (_) {}
        }
        if (claimTokenStr && !apiKey) {
          setStatus('redirecting');
          const returnUrl = `/plugin-connect?claimToken=${encodeURIComponent(claimTokenStr)}${nonceStr ? `&nonce=${encodeURIComponent(nonceStr)}` : ''}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        if (!nonceStr) {
          setStatus('error');
          setMessage('Missing nonce. Open this page from the FigDex plugin.');
          return;
        }

        if (!apiKey) {
          setStatus('redirecting');
          const returnUrl = `/plugin-connect?nonce=${encodeURIComponent(nonceStr)}${docId ? `&docId=${encodeURIComponent(String(docId))}` : ''}`;
          window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
          return;
        }

        setStatus('connecting');
        await new Promise((r) => setTimeout(r, 400));
        const res = await fetch('/api/plugin-connect/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ nonce: nonceStr }),
        });
        if (res.ok) {
          setStatus('success');
          setMessage('Connected! You can close this window and return to Figma.');
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to connect');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Something went wrong.');
      }
    };

    run();
  }, [router.isReady, nonce, docId, claimToken, mode, anonIdQuery]);

  return (
    <>
      <Head>
        <title>FigDex – Connect plugin</title>
      </Head>
      <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
        {status === 'checking' && <p>Checking…</p>}
        {status === 'redirecting' && <p>Redirecting to login…</p>}
        {status === 'connecting' && <p>Connecting your account…</p>}
        {status === 'success' && (
          <>
            <p style={{ color: '#43a047' }}>{message}</p>
            <p style={{ marginTop: 16 }}>
              <Link href="/gallery" style={{ color: '#1976d2' }}>Go to gallery</Link>
            </p>
          </>
        )}
        {status === 'error' && <p style={{ color: '#d32f2f' }}>{message}</p>}
      </div>
    </>
  );
}
