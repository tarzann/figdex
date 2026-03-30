export type AdminClientUser = {
  email?: string;
  api_key?: string;
};

export async function requireAdminClientAccess(): Promise<{
  ok: boolean;
  apiKey: string | null;
  user: AdminClientUser | null;
}> {
  try {
    const raw = window.localStorage.getItem('figma_web_user');
    if (!raw) {
      return { ok: false, apiKey: null, user: null };
    }

    const user = JSON.parse(raw) as AdminClientUser;
    const apiKey = typeof user?.api_key === 'string' && user.api_key.trim() ? user.api_key.trim() : null;
    if (!apiKey) {
      return { ok: false, apiKey: null, user };
    }

    const response = await fetch('/api/admin/auth', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const payload = await response.json().catch(() => null);
    const isAdmin = response.ok && payload?.success && payload?.isAdmin === true;

    return {
      ok: isAdmin,
      apiKey,
      user,
    };
  } catch {
    return { ok: false, apiKey: null, user: null };
  }
}
