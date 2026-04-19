/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — API Helpers
 * ═══════════════════════════════════════════════════════════════
 * Standardized API response helpers and error classes.
 * Every API route should use these for consistent error handling.
 *
 * Usage in route handlers:
 *   return apiSuccess({ user })
 *   return apiError('Not found', 404)
 *   throw new AppError('Invalid OTP', 400)
 */

import { NextRequest, NextResponse } from 'next/server';

// ── CSRF PROTECTION ───────────────────────────────────────────
// Check that mutation requests come from our own origin.
// Applied automatically in withErrorHandling for POST/PATCH/DELETE.

export function checkOrigin(request: NextRequest): boolean {
  const origin  = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // If neither header is present (e.g., server-to-server), allow
  if (!origin && !referer) return true;

  const appHost = process.env.NEXT_PUBLIC_APP_URL || '';
  const check = origin || referer || '';

  // Allow same-origin, localhost in dev, and configured app URL
  if (
    check.startsWith('http://localhost') ||
    check.startsWith('https://localhost') ||
    (appHost && check.startsWith(appHost))
  ) {
    return true;
  }

  // In development, always allow
  if (process.env.NODE_ENV !== 'production') return true;

  return false;
}

// ── STANDARDIZED RESPONSES ────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function apiError(error: string, status = 400, retryAfterSeconds?: number) {
  const headers: Record<string, string> = {};
  if (status === 429 && retryAfterSeconds) {
    headers['Retry-After'] = String(retryAfterSeconds);
    headers['X-RateLimit-Remaining'] = '0';
  }
  return NextResponse.json({ ok: false, error }, { status, headers });
}

// ── APP ERROR CLASS ───────────────────────────────────────────
// Throw from anywhere in API routes — catches produce correct HTTP responses

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ── SAFE API HANDLER WRAPPER ──────────────────────────────────
// Wraps route handlers with automatic error catching + CSRF enforcement

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest) => {
    try {
      // CSRF: reject mutating requests from foreign origins in production
      if (MUTATING_METHODS.has(request.method) && !checkOrigin(request)) {
        return apiError('Forbidden', 403);
      }

      return await handler(request);
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode, err.retryAfterSeconds);
      }
      console.error('[api] Unhandled error:', err);
      return apiError('Internal server error', 500);
    }
  };
}

// ── VALIDATION HELPERS ────────────────────────────────────────

export function requireFields<T extends Record<string, unknown>>(
  body: T,
  fields: (keyof T)[],
): void {
  for (const field of fields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      throw new AppError(`Missing required field: ${String(field)}`, 400);
    }
  }
}

export function requireEmail(email: string): string {
  const trimmed = (email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new AppError('Invalid email address', 400);
  }
  return trimmed;
}
