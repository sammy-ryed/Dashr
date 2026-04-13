'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@/types';
import NotificationBell from '@/components/NotificationBell';

interface AgentShellProps {
  children: React.ReactNode;
  forceCustomerMode?: boolean;
}

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default function AgentShell({ children, forceCustomerMode }: AgentShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [agent, setAgent] = useState<User | null>(null);
  const [weeklyEarned, setWeeklyEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [customerMode, setCustomerMode] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!profile || profile.role !== 'agent') { router.push('/order'); return; }
      setAgent(profile as User);

      // Weekly earnings
      const { data: ledger } = await supabase
        .from('ledger')
        .select('amount')
        .eq('agent_id', user.id)
        .eq('is_paid', false);
      setWeeklyEarned((ledger || []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0));

      setLoading(false);
    }
    init();
  }, []);

  // Session management: 16hr auto-logout + 5hr auto-offline
  useEffect(() => {
    if (!agent) return;

    // Track last activity
    const SESSION_KEY = 'dashr_session_start';
    const ACTIVITY_KEY = 'dashr_last_activity';
    const SESSION_MAX_MS = 16 * 60 * 60 * 1000; // 16 hours
    const INACTIVE_MAX_MS = 5 * 60 * 60 * 1000;  // 5 hours

    // Set session start if not set
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }

    // Update activity on interactions
    function updateActivity() {
      localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
    }
    updateActivity();

    window.addEventListener('click', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);

    // Check every 60 seconds
    const interval = setInterval(async () => {
      const sessionStart = Number(localStorage.getItem(SESSION_KEY) || Date.now());
      const lastActivity = Number(localStorage.getItem(ACTIVITY_KEY) || Date.now());
      const now = Date.now();

      // 16hr session expiry → auto logout
      if (now - sessionStart > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ACTIVITY_KEY);
        await supabase.from('users').update({ is_online: false }).eq('id', agent.id);
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      // 5hr inactivity → auto offline (but don't logout)
      if (agent.is_online && now - lastActivity > INACTIVE_MAX_MS) {
        await supabase.from('users').update({ is_online: false }).eq('id', agent.id);
        setAgent((prev) => prev ? { ...prev, is_online: false } : null);
      }
    }, 60_000);

    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, [agent?.id, agent?.is_online]);

  async function toggleOnline() {
    if (!agent) return;
    const newState = !agent.is_online;
    await supabase.from('users').update({ is_online: newState }).eq('id', agent.id);
    setAgent({ ...agent, is_online: newState });
    // Reset activity timer when going online
    if (newState) localStorage.setItem('dashr_last_activity', Date.now().toString());
  }

  async function handleLogout() {
    setLoggingOut(true);
    if (agent) {
      await supabase.from('users').update({ is_online: false }).eq('id', agent.id);
    }
    localStorage.removeItem('dashr_session_start');
    localStorage.removeItem('dashr_last_activity');
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initial = agent?.name ? agent.name.charAt(0).toUpperCase() : '?';

  const sidebarLinks = [
    { href: '/agent/dashboard', label: 'Live Feed', icon: '⬡' },
    { href: '/agent/active', label: 'Active Delivery', icon: '◈' },
    { href: '/agent/ledger', label: 'My Ledger', icon: '≡' },
  ];

  const customerLinks = [
    { href: '/order', label: 'Place Order', icon: '○' },
    { href: '/orders', label: 'My Orders', icon: '□' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Top nav with hamburger */}
      <nav className="nav">
        <Link href="/" className="nav-logo">DASHR<sup>SRM</sup></Link>

        {/* Desktop nav links (visible on desktop, hidden on mobile) */}
        <ul className="nav-links">
          {sidebarLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <NotificationBell />

          {/* Online/offline status */}
          <button
            className="nav-cta"
            onClick={toggleOnline}
            style={{ background: agent?.is_online ? 'var(--green)' : 'var(--yellow)' }}
          >
            {agent?.is_online ? '● Online' : 'Go Online'}
          </button>

          {/* Hamburger */}
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

      {/* Slide-out menu (hamburger) */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.4rem', borderBottom: '0.14rem solid #2a2a2a' }}>
              <div className="nav-logo" style={{ padding: 0, fontSize: '1.4rem' }}>
                DASHR<sup>SRM</sup>
              </div>
              <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="nav-user-avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.7rem' }}>{initial}</div>
                <div>
                  <div className="type-label" style={{ color: 'var(--white)' }}>{agent?.name}</div>
                  <div className="type-label" style={{ fontSize: '0.55rem', color: 'var(--muted)' }}>
                    ★ {agent?.rating?.toFixed(1)} · {agent?.srm_id || 'Dasher'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0.8rem 0', flex: 1 }}>
              {sidebarLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`mobile-menu-link ${pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {l.icon} &nbsp;{l.label}
                </Link>
              ))}

              {/* Customer Mode Toggle */}
              <div style={{ padding: '0.6rem 1.4rem', borderTop: '0.12rem solid #2a2a2a', marginTop: '0.4rem' }}>
                <div
                  className="mobile-menu-link"
                  style={{ padding: '0.5rem 0', cursor: 'pointer', borderLeft: 'none' }}
                  onClick={() => setCustomerMode(!customerMode)}
                >
                  <span style={{ fontSize: '0.65rem', color: customerMode ? 'var(--green)' : 'var(--muted)' }}>
                    {customerMode ? '✓ Customer Mode ON' : '○ Customer Mode'}
                  </span>
                </div>
              </div>

              {customerMode && (
                <div style={{ borderTop: '0.12rem solid #2a2a2a' }}>
                  {customerLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`mobile-menu-link ${pathname === l.href ? 'active' : ''}`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {l.icon} &nbsp;{l.label}
                    </Link>
                  ))}
                </div>
              )}
              <Link
                href="/profile"
                className={`mobile-menu-link ${pathname === '/profile' ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
            </div>

            <div style={{ padding: '1.2rem 1.4rem', borderTop: '0.14rem solid #2a2a2a' }}>
              <button
                className="btn btn-danger btn-block btn-sm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard layout with sidebar */}
      <div className="dash-wrap" style={{ margin: '0' }}>
        <aside className="sidebar">
          <div className="sb-head">
            <div className="sb-agent-name">{agent?.name?.split(' ')[0] || 'Dasher'}</div>
            <div className="sb-agent-meta">
              {agent?.srm_id || 'SRM ID'} · ★ {agent?.rating?.toFixed(1)}
            </div>
            <div
              className="sb-toggle toggle-row"
              onClick={toggleOnline}
              style={{ cursor: 'pointer' }}
            >
              <div className={`toggle-track ${agent?.is_online ? 'on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-lbl" style={{ color: agent?.is_online ? 'var(--green)' : 'var(--muted)', fontSize: '0.65rem' }}>
                {agent?.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <nav className="sb-nav">
            {sidebarLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}
              >
                {l.icon} &nbsp;{l.label}
              </Link>
            ))}
          </nav>

          {/* Customer Mode Toggle */}
          <div style={{ padding: '0 1.3rem', borderTop: '0.14rem solid #2a2a2a', paddingTop: '0.8rem' }}>
            <div
              className="sb-toggle toggle-row"
              onClick={() => setCustomerMode(!customerMode)}
              style={{ cursor: 'pointer' }}
            >
              <div className={`toggle-track ${customerMode ? 'on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-lbl" style={{ color: customerMode ? 'var(--green)' : 'var(--muted)', fontSize: '0.6rem' }}>
                CUSTOMER MODE
              </span>
            </div>
          </div>

          {customerMode && (
            <nav className="sb-nav" style={{ padding: '0.4rem 0', borderTop: '0.12rem solid #2a2a2a' }}>
              {customerLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={pathname === l.href || pathname.startsWith(l.href + '/') ? 'active' : ''}
                >
                  {l.icon} &nbsp;{l.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="sb-earnings">
            <div className="sb-earn-lbl">Earned This Week</div>
            <div className="sb-earn-val">₹{weeklyEarned}</div>
            <div className="sb-earn-wk">Week: {getWeekStart()}</div>
          </div>

          {/* Logout at bottom of sidebar */}
          <div style={{ padding: '1rem 1.3rem', borderTop: '0.14rem solid #2a2a2a' }}>
            <button
              className="btn btn-danger btn-block btn-sm"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="dash-main">
          {children}
        </div>
      </div>
    </div>
  );
}
