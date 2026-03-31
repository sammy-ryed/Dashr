import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/onboarding') || pathname.startsWith('/auth')) {
    if (user) {
      return NextResponse.redirect(new URL('/order', request.url));
    }
    return supabaseResponse;
  }

  // Protected routes — require login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch user profile for role-based routing
  const { data: profile } = await supabase
    .from('users')
    .select('role, is_verified')
    .eq('id', user.id)
    .single();

  // Agent routes
  if (pathname.startsWith('/agent')) {
    if (!profile || profile.role !== 'agent') {
      return NextResponse.redirect(new URL('/order', request.url));
    }
    if (!profile.is_verified) {
      return NextResponse.redirect(new URL('/onboarding?pending=true', request.url));
    }
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/order', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
