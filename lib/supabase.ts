import { createBrowserClient } from '@supabase/ssr';

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
  }
  return _client;
}
