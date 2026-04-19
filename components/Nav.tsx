'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import NotificationBell from '@/components/NotificationBell';
import HamburgerThemePanel from '@/components/HamburgerThemePanel';

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
  const [showAbout, setShowAbout] = useState(false);
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
    const SCROLL_DELTA_THRESHOLD = 20; // increased to ignore tiny focus-induced shifts
    const TOP_SAFE_ZONE = 24;

    let focusScrollLock = false;  // true for 300ms after focus events
    let clickScrollLock = false;  // true for 150ms after click events
    let focusTimer: ReturnType<typeof setTimeout>;
    let clickTimer: ReturnType<typeof setTimeout>;

    function isFormElement(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return ['input', 'textarea', 'select', 'button'].includes(tag);
    }

    function onFocus() {
      focusScrollLock = true;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => { focusScrollLock = false; }, 300);
    }

    function onBlur() {
      // Keep locked a bit after blur too (keyboard close bounce)
      focusScrollLock = true;
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => { focusScrollLock = false; }, 300);
    }

    function onClick() {
      clickScrollLock = true;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickScrollLock = false; }, 150);
    }

    function onScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      // Always update baseline — prevents delta accumulation
      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
        lastScrollYRef.current = currentY;
        return;
      }

      // Lock nav visible if any form element is focused
      if (isFormElement(document.activeElement)) {
        lastScrollYRef.current = currentY;
        return;
      }

      // Lock nav visible during focus/click transitions
      if (focusScrollLock || clickScrollLock) {
        lastScrollYRef.current = currentY;
        return;
      }

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
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('focusout', onBlur, true);
    document.addEventListener('click', onClick, true);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('focusout', onBlur, true);
      document.removeEventListener('click', onClick, true);
      clearTimeout(focusTimer);
      clearTimeout(clickTimer);
    };
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

          {/* Mobile hamburger — always show */}
          <button
            className="hamburger hamburger-always"
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

              {/* About link */}
              <button
                className="mobile-menu-link"
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => { setMenuOpen(false); setShowAbout(true); }}
              >
                <span style={{ marginRight: '0.5rem' }}>✦</span> About Us
              </button>

              {/* Legal links */}
              <div style={{ padding: '0.6rem 1.4rem', borderTop: '0.12rem solid #2a2a2a', marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Link href="/terms" className="type-mono" style={{ fontSize: '0.55rem', color: 'var(--muted)', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Terms</Link>
                  <Link href="/privacy" className="type-mono" style={{ fontSize: '0.55rem', color: 'var(--muted)', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Privacy</Link>
                  <Link href="/refund-policy" className="type-mono" style={{ fontSize: '0.55rem', color: 'var(--muted)', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Refunds</Link>
                </div>
              </div>

              <HamburgerThemePanel />
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

      {/* ── ABOUT PANEL ─────────────────────────────────── */}
      {showAbout && (
        <div className="about-overlay" onClick={() => setShowAbout(false)}>
          <div className="about-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="about-header">
              <div>
                <div className="about-label">THE TEAM BEHIND</div>
                <div className="about-title">DASHR<sup>SRM</sup></div>
              </div>
              <button className="about-close" onClick={() => setShowAbout(false)} aria-label="Close">✕</button>
            </div>

            <div className="about-scroll">
              {/* Origin story */}
              <div className="about-story">
                <div className="about-story-label">{'// origin_story.txt'}</div>
                <p className="about-story-text">
                  It started simple: we just wanted chips and shi from <span className="about-hl">Durga Samy</span> and the senior block shop delivered to the hostel.
                  Went to the shops, pitched the idea. Same answer every time: <span className="about-hl">no delivery guys</span>.
                </p>
                <p className="about-story-text">
                  So we sat with the problem. Thought about it. And then — <span className="about-hl">it hit us like a bus</span>.
                  Why not connect the students who want deliveries with the ones willing to run them?
                </p>
                <p className="about-story-text">
                  And boom. <span className="about-hl">Here we are.</span>
                </p>
              </div>

              {/* Divider */}
              <div className="about-divider" />

              {/* Founders */}
              <div className="about-founders-label">— the people who built this</div>
              <div className="about-founders">

                {/* Sammy */}
                <div className="about-card">
                  <div className="about-photo-wrap">
                    <Image
                      src="/sammy.jpg"
                      alt="Edward Samarth"
                      width={80}
                      height={80}
                      className="about-photo"
                    />
                    <div className="about-photo-ring" />
                  </div>
                  <div className="about-card-info">
                    <div className="about-card-role">CO-FOUNDER &amp; DEV</div>
                    <div className="about-card-name">Edward Samarth</div>
                    <div className="about-card-handle">@sammy-ryed</div>
                    <div className="about-card-links">
                      <a href="https://edwardsamarth.vercel.app/" target="_blank" rel="noopener noreferrer" className="about-link">Portfolio</a>
                      <a href="https://github.com/sammy-ryed" target="_blank" rel="noopener noreferrer" className="about-link">GitHub</a>
                    </div>
                  </div>
                </div>

                {/* Chaitanya */}
                <div className="about-card">
                  <div className="about-photo-wrap">
                    <Image
                      src="/chaitanya.jpg"
                      alt="Chaitanya Potnuru"
                      width={80}
                      height={80}
                      className="about-photo"
                    />
                    <div className="about-photo-ring" />
                  </div>
                  <div className="about-card-info">
                    <div className="about-card-role">CO-FOUNDER</div>
                    <div className="about-card-name">Chaitanya Potnuru</div>
                    <div className="about-card-handle">@Chaitanya303212</div>
                    <div className="about-card-links">
                      <a href="https://github.com/Chaitanya303212" target="_blank" rel="noopener noreferrer" className="about-link">GitHub</a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer note */}
              <div className="about-footer-note">
                Built at SRM — two hostel kids who got hungry and decided to fix it.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
