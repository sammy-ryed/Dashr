'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  role?: 'customer' | 'agent' | 'admin';
  userName?: string;
  isOnline?: boolean;
  onToggleOnline?: () => void;
}

export default function Nav({ role, userName, isOnline, onToggleOnline }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        DASHR<sup>SRM</sup>
      </Link>

      <ul className="nav-links">
        {role === 'customer' || !role ? (
          <>
            <li><Link href="/order" className={pathname === '/order' ? 'active' : ''}>Order</Link></li>
          </>
        ) : null}

        {role === 'agent' ? (
          <>
            <li><Link href="/agent/dashboard" className={pathname.startsWith('/agent/dashboard') ? 'active' : ''}>Feed</Link></li>
            <li><Link href="/agent/active" className={pathname.startsWith('/agent/active') ? 'active' : ''}>Active</Link></li>
            <li><Link href="/agent/ledger" className={pathname.startsWith('/agent/ledger') ? 'active' : ''}>Ledger</Link></li>
          </>
        ) : null}

        {role === 'admin' ? (
          <>
            <li><Link href="/admin" className={pathname === '/admin' ? 'active' : ''}>Admin</Link></li>
          </>
        ) : null}
      </ul>

      {role === 'agent' && onToggleOnline ? (
        <button className="nav-cta" onClick={onToggleOnline} style={{ background: isOnline ? 'var(--green)' : 'var(--yellow)' }}>
          {isOnline ? '● Online' : 'Go Online →'}
        </button>
      ) : (
        <Link href="/login" className="nav-cta" style={{ display: 'flex', alignItems: 'center' }}>
          {userName ? userName.split(' ')[0] : 'Login'}
        </Link>
      )}
    </nav>
  );
}
