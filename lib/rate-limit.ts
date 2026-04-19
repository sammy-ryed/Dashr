/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — In-Memory Rate Limiter
 * ═══════════════════════════════════════════════════════════════
 * Sliding window rate limiter. No Redis required.
 * Entries auto-clean on access to prevent memory leaks.
 *
 * Usage:
 *   const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
 *   const result = limiter.check(identifier);
 *   if (!result.allowed) return apiError('Too many requests', 429);
 */

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface WindowEntry {
  timestamps: number[];
  lastClean: number;
}

const stores = new Map<string, Map<string, WindowEntry>>();

export function createRateLimiter(config: RateLimitConfig) {
  const storeKey = `${config.max}:${config.windowMs}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  // Periodic cleanup of stale entries (every 5 minutes)
  const CLEANUP_INTERVAL = 5 * 60 * 1000;

  function cleanStore() {
    const now = Date.now();
    const cutoff = now - config.windowMs * 2;
    for (const [key, entry] of store.entries()) {
      if (entry.lastClean < cutoff) {
        store.delete(key);
      }
    }
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      let entry = store.get(identifier);
      if (!entry) {
        entry = { timestamps: [], lastClean: now };
        store.set(identifier, entry);
      }

      // Prune old timestamps
      entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
      entry.lastClean = now;

      if (entry.timestamps.length >= config.max) {
        const oldest = entry.timestamps[0];
        const retryAfterMs = oldest + config.windowMs - now;
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, retryAfterMs),
        };
      }

      entry.timestamps.push(now);
      return {
        allowed: true,
        remaining: config.max - entry.timestamps.length,
        retryAfterMs: 0,
      };
    },

    /** Remove all entries for an identifier (e.g. after successful action) */
    reset(identifier: string) {
      store.delete(identifier);
    },
  };
}

// ── Pre-configured limiters for each endpoint ─────────────────

/** Auth OTP: 3 per 10 minutes per IP */
export const otpLimiter = createRateLimiter({ max: 3, windowMs: 10 * 60 * 1000 });

/** Signup: 5 per hour per IP */
export const signupLimiter = createRateLimiter({ max: 5, windowMs: 60 * 60 * 1000 });

/** Order creation: 10 per hour per user */
export const orderCreateLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

/** Reports: 5 per day per user */
export const reportLimiter = createRateLimiter({ max: 5, windowMs: 24 * 60 * 60 * 1000 });

/** Order accept: 20 per hour per user */
export const orderAcceptLimiter = createRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 });

/** Login attempts: 10 per 15 minutes per IP */
export const loginLimiter = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
