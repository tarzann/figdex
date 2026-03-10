/**
 * In-memory store for plugin-connect nonces. TTL 10 minutes.
 * Used by GET /api/plugin-connect/status and POST /api/plugin-connect/complete.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Entry {
  token: string;
  userId: string;
  createdAt: number;
}

const store = new Map<string, Entry>();

function prune() {
  const now = Date.now();
  for (const [nonce, entry] of store.entries()) {
    if (now - entry.createdAt > TTL_MS) store.delete(nonce);
  }
}

export function set(nonce: string, token: string, userId: string): void {
  prune();
  store.set(nonce, { token, userId, createdAt: Date.now() });
}

export function get(nonce: string): { token: string; userId: string } | null {
  prune();
  const entry = store.get(nonce);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(nonce);
    return null;
  }
  return { token: entry.token, userId: entry.userId };
}
