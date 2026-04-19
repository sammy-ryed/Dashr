'use client';

import { useState } from 'react';

interface RatingModalProps {
  orderId: string;
  raterId: string;
  ratedName: string;
  raterRole: 'customer' | 'dasher';
  onClose: () => void;
  onSubmitted?: () => void;
  onReport?: () => void;  // optional: open the report modal directly
}

export default function RatingModal({ orderId, raterId, ratedName, raterRole, onClose, onSubmitted, onReport }: RatingModalProps) {
  const [score, setScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  async function handleSubmit() {
    if (score === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/orders/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, raterId, score }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Failed to submit rating');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);
    } catch {
      setError('Network error.');
    }
    setSubmitting(false);
  }

  const displayScore = hoveredStar || score;

  return (
    <div className="rating-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <div className="type-h2" style={{ color: 'var(--green)' }}>Thanks!</div>
            <div className="type-label" style={{ marginTop: '0.5rem' }}>Rating submitted</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="type-h2" style={{ textTransform: 'none', letterSpacing: '0.02em' }}>
                Rate {raterRole === 'customer' ? 'your Dasher' : 'the Customer'}
              </div>
              <div className="type-label" style={{ marginTop: '0.4rem' }}>{ratedName}</div>
            </div>

            <div className="star-row">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  className={`star-btn ${i <= displayScore ? 'active' : ''}`}
                  onClick={() => setScore(i)}
                  onMouseEnter={() => setHoveredStar(i)}
                  onMouseLeave={() => setHoveredStar(0)}
                  aria-label={`${i} star${i > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>

            {displayScore > 0 && (
              <div className="star-label">{labels[displayScore]}</div>
            )}

            {error && <div className="notice notice-r" style={{ marginTop: '1rem', fontSize: '0.7rem' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Skip</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleSubmit}
                disabled={score === 0 || submitting}
              >
                {submitting ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : `Submit ${score > 0 ? `${score}★` : ''}`}
              </button>
            </div>

            {/* Report option — only shown for dashers who want to report a non-paying customer */}
            {onReport && (
              <div style={{ marginTop: '0.8rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { onClose(); onReport(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.58rem',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Report an issue instead
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
