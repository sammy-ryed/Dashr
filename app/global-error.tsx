'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your error reporting service in production
    console.error('[DASHR] Unhandled error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#0f0f0f',
          color: '#f0f0f0',
          fontFamily: "'Arial Black', Impact, sans-serif",
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: '4rem',
              fontWeight: 700,
              color: '#e9b50b',
              lineHeight: 1,
              marginBottom: '0.5rem',
              letterSpacing: '-0.04em',
            }}
          >
            500
          </div>

          <div
            style={{
              fontFamily: "'Arial Black', Impact, sans-serif",
              fontSize: '1.5rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}
          >
            Something went wrong
          </div>

          <div
            style={{
              fontFamily: "'Courier Prime', 'Courier New', monospace",
              fontSize: '0.72rem',
              color: '#888',
              letterSpacing: '0.04em',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <div style={{ marginTop: '0.5rem', color: '#555' }}>
                Reference: {error.digest}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                fontFamily: "'Arial Black', Impact, sans-serif",
                fontSize: '0.82rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '0.75em 1.6em',
                cursor: 'pointer',
                background: '#e9b50b',
                color: '#000',
                border: '0.18rem solid #000',
                boxShadow: '0.4rem 0.4rem 0 #000',
                minHeight: '2.75rem',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              style={{
                fontFamily: "'Arial Black', Impact, sans-serif",
                fontSize: '0.82rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '0.75em 1.6em',
                cursor: 'pointer',
                background: 'transparent',
                color: '#f0f0f0',
                border: '0.18rem solid #f0f0f0',
                boxShadow: '0.4rem 0.4rem 0 #f0f0f0',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '2.75rem',
              }}
            >
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
