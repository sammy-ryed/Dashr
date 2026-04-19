import { validateEnv } from '@/lib/config';

// Validate required environment variables at startup.
// This runs when the instrumentation module loads (before any requests).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const errors = validateEnv();
    if (errors.length > 0) {
      console.error(
        '\n[DASHR] STARTUP ERROR — Missing environment variables:\n' +
          errors.map((e) => `  • ${e}`).join('\n') +
          '\n\nApp may not function correctly. Set these in your deployment environment.\n',
      );
      // In production, fail hard so the deployment surfaces the problem
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      console.log('[DASHR] Environment validated OK');
    }
  }
}
