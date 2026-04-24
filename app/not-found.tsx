'use client';

import Link from 'next/link';
import { useCollege } from '@/lib/college-context';

export default function NotFound() {
  const { college } = useCollege();
  return (
    <div
      className="page-enter"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
        <div
          className="nav-logo"
          style={{ justifyContent: 'center', fontSize: '1.8rem', marginBottom: '2rem' }}
        >
          DASHR<sup>{college.name}</sup>
        </div>

        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '5rem',
            fontWeight: 700,
            color: 'var(--yellow)',
            lineHeight: 1,
            marginBottom: '0.5rem',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </div>

        <div className="type-h2" style={{ marginBottom: '1rem' }}>
          Page not found
        </div>

        <div
          className="type-label"
          style={{ marginBottom: '2rem', lineHeight: 1.7, color: 'var(--muted)' }}
        >
          The page you are looking for does not exist or has been moved.
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link href="/login" className="btn btn-ghost">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
