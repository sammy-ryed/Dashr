'use client';

import { useState, useRef } from 'react';

interface RatingModalProps {
  orderId: string;
  raterId: string;
  ratedName: string;
  raterRole: 'customer' | 'dasher';
  onClose: () => void;
  onSubmitted?: () => void;
  onReport?: () => void;
}

export default function RatingModal({ orderId, raterId, ratedName, raterRole, onClose, onSubmitted, onReport }: RatingModalProps) {
  const [score, setScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  // Guard against double-submit / re-render-triggered calls
  const hasSubmittedRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  async function handleSubmit() {
    if (score === 0 || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
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
        hasSubmittedRef.current = false;
        return;
      }
      setSubmitting(false);
      setSubmitted(true);
      // Fire onSubmitted + onClose exactly once after a short delay
      closeTimerRef.current = setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1500);
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }

  // Clean up timer if component unmounts early
  function handleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    onClose();
  }

  const displayScore = hoveredStar || score;

  return (
    // Only close when clicking directly on the backdrop, not the modal content
    <div
      className="rating-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="rating-modal">
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
                  onClick={() => !submitted && setScore(i)}
                  onMouseEnter={() => !submitted && setHoveredStar(i)}
                  onMouseLeave={() => setHoveredStar(0)}
                  aria-label={`${i} star${i > 1 ? 's' : ''}`}
                  disabled={submitting || submitted}
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
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleClose} disabled={submitting}>Skip</button>
              <button
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={handleSubmit}
                disabled={score === 0 || submitting || submitted}
              >
                {submitting ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : `Submit ${score > 0 ? `${score}★` : ''}`}
              </button>
            </div>

            {onReport && (
              <div style={{ marginTop: '0.8rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { handleClose(); onReport(); }}
                  style={{
                    background: 'none', border: 'none',
                    fontFamily: 'var(--mono)', fontSize: '0.58rem',
                    color: 'var(--muted)', cursor: 'pointer',
                    textDecoration: 'underline', letterSpacing: '0.06em',
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
