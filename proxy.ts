/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Subdomain Multi-Tenancy Proxy
 * ═══════════════════════════════════════════════════════════════
 *
 * Slug resolution priority (highest → lowest):
 *   1. ?__slug=manipal  query param  (dev/testing escape hatch)
 *   2. Subdomain        manipal.dashr.in
 *   3. NEXT_PUBLIC_DEFAULT_SLUG env var  (set per Vercel project)
 *   4. Hard-coded fallback: 'srm'
 *
 * ── FREE MULTI-TENANT SETUP (no domain needed) ───────────────
 *   Create two Vercel projects from the same GitHub repo:
 *     Project "dashr-srm"     → env: NEXT_PUBLIC_DEFAULT_SLUG=srm
 *     Project "dashr-manipal" → env: NEXT_PUBLIC_DEFAULT_SLUG=manipal
 *   URLs become:
 *     https://dashr-srm.vercel.app     → SRM
 *     https://dashr-manipal.vercel.app → MAHE Bengaluru
 *
 * ── HOW TO ADD A NEW COLLEGE ─────────────────────────────────
 *   1. Add config to lib/colleges.ts  (copy "manipal" block)
 *   2. Add slug to KNOWN_SLUGS below
 *   3. Create a new Vercel project with NEXT_PUBLIC_DEFAULT_SLUG=<slug>
 *      OR point a subdomain at the deployment
 * ────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';

/** Slugs that have a registered college config. Unknown slugs fall back to DEFAULT_SLUG. */
const KNOWN_SLUGS = new Set(['srm', 'manipal']);

/** Subdomains that are NOT college slugs — treat as main site. */
const SKIP_SUBDOMAINS = new Set(['www', 'api', 'cdn', 'mail', 'app']);

/**
 * The fallback slug when no subdomain is detected.
 * Override per-deployment via NEXT_PUBLIC_DEFAULT_SLUG env var.
 * Example: set NEXT_PUBLIC_DEFAULT_SLUG=manipal in dashr-manipal Vercel project.
 */
const ENV_DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_SLUG ?? 'srm';
const DEFAULT_SLUG = KNOWN_SLUGS.has(ENV_DEFAULT) ? ENV_DEFAULT : 'srm';

function extractSlug(host: string, searchParams: URLSearchParams): string {
  // 1. Query param escape hatch — ?__slug=manipal (useful for dev/testing)
  const qSlug = searchParams.get('__slug');
  if (qSlug && KNOWN_SLUGS.has(qSlug)) return qSlug;

  // 2. Subdomain extraction
  const hostname = host.split(':')[0];
  const parts = hostname.split('.');

  // No subdomain (bare domain like dashr.in has 2 parts, localhost has 1)
  if (parts.length <= 2) return DEFAULT_SLUG;

  const subdomain = parts[0].toLowerCase();

  // Skip infrastructure subdomains
  if (SKIP_SUBDOMAINS.has(subdomain)) return DEFAULT_SLUG;

  // 3. Known slug in subdomain → use it, else env var default
  return KNOWN_SLUGS.has(subdomain) ? subdomain : DEFAULT_SLUG;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost';
  const searchParams = request.nextUrl.searchParams;
  const slug = extractSlug(host, searchParams);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-college-slug', slug);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|sitemap|robots|manifest|api/).*)',
  ],
};

