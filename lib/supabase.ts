import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';


let _client: ReturnType<typeof createBrowserClient> | null = null;

// During SSR/build there are no valid env vars — return a safe no-op proxy
const noopResult = { data: null, error: null, count: null };
type NoopFn = (...args: unknown[]) => Promise<typeof noopResult>;

const noopCallable: NoopFn = new Proxy<NoopFn>(
  async () => noopResult,
  {
    get: () => noopCallable,
    apply: async () => noopResult,
  }
);

const noop = noopCallable as unknown as ReturnType<typeof createBrowserClient>;

export function createClient() {
  if (typeof window === 'undefined') {
    return noop;
  }
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Silently clear stale/invalid refresh tokens so users don't see
    // 'Invalid Refresh Token: Refresh Token Not Found' console errors.
    // This fires when the stored session has expired server-side.
    _client.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {

      if (
        event === 'SIGNED_OUT' ||
        (event === 'TOKEN_REFRESHED' && !session)
      ) {
        // Session is gone — clear any lingering localStorage keys Supabase may
        // have left behind so the next page load starts fresh.
        const prefix = 'sb-';
        Object.keys(localStorage)
          .filter((k) => k.startsWith(prefix))
          .forEach((k) => localStorage.removeItem(k));
      }
    });
  }
  return _client;
}
