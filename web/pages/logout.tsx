import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Logout() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Sign out from Supabase OAuth session (clears sb- tokens it manages)
        try {
          // Only import supabase on client side
          if (typeof window !== 'undefined') {
            const { supabase } = await import('../lib/supabase');
            await supabase.auth.signOut();
          }
        } catch {}
        // 2) Remove local app storage
        try {
          localStorage.removeItem('figma_web_user');
          localStorage.removeItem('figdex_anon_id');
          localStorage.removeItem('figma_access_token');
          // Remove any Supabase cached tokens in localStorage
          Object.keys(localStorage)
            .filter((k) => k.startsWith('sb-') || k.startsWith('figdex_'))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        // 3) Best-effort: clear sb-* cookies on this domain
        try {
          document.cookie
            .split(';')
            .map((c) => c.trim())
            .filter((c) => /^sb-/.test(c))
            .forEach((c) => {
              const name = c.split('=')[0];
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            });
        } catch {}
      } finally {
        const target = router.query.redirect === 'gallery' ? '/gallery' : '/login';
        router.replace(target);
      }
    };
    run();
  }, [router, router.query.redirect]);

  return null;
}


