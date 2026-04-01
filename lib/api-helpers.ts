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

// ── STANDARDIZED RESPONSES ────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

// ── APP ERROR CLASS ───────────────────────────────────────────
// Throw from anywhere in API routes — catches produce correct HTTP responses

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ── SAFE API HANDLER WRAPPER ──────────────────────────────────
// Wraps route handlers with automatic error catching

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.statusCode);
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
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new AppError('Invalid email address', 400);
  }
  return trimmed;
}
