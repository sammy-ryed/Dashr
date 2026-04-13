'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';

interface NavProps {
  role?: 'customer' | 'agent' | 'admin';
  actualRole?: string;
  userName?: string;
  isOnline?: boolean;
  onToggleOnline?: () => void;
  isLoading?: boolean;
}

export default function Nav({ role, actualRole, userName, isOnline, onToggleOnline, isLoading }: NavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // Session management: 16hr auto-logout
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SESSION_KEY = 'dashr_session_start';
    const SESSION_MAX_MS = 16 * 60 * 60 * 1000;
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }
    const interval = setInterval(async () => {
      const sessionStart = Number(localStorage.getItem(SESSION_KEY) || Date.now());
      if (Date.now() - sessionStart > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('dashr_last_activity');
        await supabase.auth.signOut();
        router.push('/login');
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Hide nav on scroll down, reveal on scroll up (desktop + mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastScrollYRef.current = window.scrollY;
    const SCROLL_DELTA_THRESHOLD = 8;
    const TOP_SAFE_ZONE = 24;

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) return;

      if (currentY <= TOP_SAFE_ZONE || menuOpen) {
        setNavHidden(false);
      } else if (delta > 0) {
        setNavHidden(true);
      } else {
        setNavHidden(false);
      }

      lastScrollYRef.current = currentY;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    localStorage.removeItem('dashr_session_start');
    localStorage.removeItem('dashr_last_activity');
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = (() => {
    if (role === 'agent') return [
      { href: '/agent/dashboard', label: 'Feed', match: '/agent/dashboard' },
      { href: '/agent/active', label: 'Active', match: '/agent/active' },
      { href: '/agent/ledger', label: 'Ledger', match: '/agent/ledger' },
    ];
    if (role === 'admin') return [
      { href: '/admin', label: 'Admin', match: '/admin' },
    ];
    return [
      { href: '/order', label: 'Order', match: '/order' },
      { href: '/orders', label: 'My Orders', match: '/orders' },
    ];
  })();

  const isAgentOnCustomerPage = actualRole === 'agent' && role !== 'agent';

  // First initial for the avatar
  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <>
      <nav className={`nav ${navHidden && !menuOpen ? 'nav-hidden' : ''}`}>
        <Link href="/" className="nav-logo">
          DASHR<sup>SRM</sup>
        </Link>

        {/* Desktop links */}
        <ul className="nav-links">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname === l.match || pathname.startsWith(l.match + '/') ? 'active' : ''}
              >
                {l.label}
              </Link>
            </li>
          ))}
          {isAgentOnCustomerPage && (
            <li key="/agent/dashboard">
              <Link href="/agent/dashboard" style={{ color: 'var(--yellow)' }}>
                Back to Dasher
              </Link>
            </li>
          )}
        </ul>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {/* Right-side controls group */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginLeft: 'auto' }}>
            {/* Agent online toggle */}
            {role === 'agent' && onToggleOnline && (
              <button
                className={`nav-online-btn ${isOnline ? 'is-online' : ''}`}
                onClick={onToggleOnline}
              >
                <div className="status-dot-pulse" />
                {isOnline ? 'On Duty' : 'Off Duty'}
              </button>
            )}

            {/* Notification Bell + User Menu unified group */}
            {userName && (
              <>
                {/* Notification Bell */}
                <NotificationBell />

                {/* User badge — clicking opens hamburger menu on desktop too */}
                {!isLoading && !(role === 'agent' && onToggleOnline) && (
                  <button
                    className="nav-user"
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{ textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <div className="nav-user-avatar">{initial}</div>
                    <span className="nav-user-name">{userName.split(' ')[0]}</span>
                  </button>
                )}
              </>
            )}

            {/* Login link if not logged in — only show after loading is done */}
            {!isLoading && !userName && !(role === 'agent') && (
              <Link href="/login" className="nav-cta" style={{ display: 'flex', alignItems: 'center' }}>
                Login
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Slide-out menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
            {/* User info */}
            <div style={{ padding: '1.4rem', borderBottom: '0.14rem solid #2a2a2a' }}>
              <div className="nav-logo" style={{ padding: 0, fontSize: '1.4rem' }}>
                DASHR<sup>SRM</sup>
              </div>
              {userName && (
                <Link href="/profile" style={{ display: 'block', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                  <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div className="nav-user-avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.7rem' }}>{initial}</div>
                    <div className="type-label" style={{ color: 'var(--white)' }}>{userName}</div>
                  </div>
                </Link>
              )}
            </div>

            {/* Navigation links */}
            <div style={{ padding: '0.8rem 0', flex: 1 }}>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`mobile-menu-link ${pathname === l.match || pathname.startsWith(l.match + '/') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              {isAgentOnCustomerPage && (
                <div style={{ padding: '0.6rem 1.4rem', borderTop: '0.12rem solid #2a2a2a', marginTop: '0.4rem', marginBottom: '0.4rem' }}>
                  <Link
                    href="/agent/dashboard"
                    className="mobile-menu-link"
                    style={{ padding: '0.5rem 0', borderLeft: 'none', color: 'var(--yellow)' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    ← Back to Dasher
                  </Link>
                </div>
              )}
              {/* Profile link in menu */}
              {userName && (
                <Link
                  href="/profile"
                  className={`mobile-menu-link ${pathname === '/profile' ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
              )}
            </div>

            {/* Logout at bottom */}
            {userName && (
              <div style={{ padding: '1.2rem 1.4rem', borderTop: '0.14rem solid #2a2a2a' }}>
                <button
                  className="btn btn-danger btn-block btn-sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  {loggingOut ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Sign Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
