import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

// During SSR/build there are no valid env vars — return a safe no-op proxy
const noop: any = new Proxy(
  {},
  {
    get: () => noop,
    apply: () => Promise.resolve({ data: null, error: null, count: null }),
  }
);

export function createClient() {
  if (typeof window === 'undefined') {
    return noop as ReturnType<typeof createBrowserClient>;
  }
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
