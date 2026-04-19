'use client';

import { useState, useRef, useEffect } from 'react';
import { REPORT_REASON_LABELS } from '@/types';
import type { ReportReason } from '@/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedId: string;
  reportedName: string;
  orderId?: string | null;
}

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

export default function ReportModal({ isOpen, onClose, reportedId, reportedName, orderId }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  async function handleSubmit() {
    if (!reason) { setError('Please select a reason'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedId,
          orderId: orderId || null,
          reason,
          notes: notes.trim(),
          evidenceUrls: [],
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Failed to submit report');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Try again.');
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      className="report-modal-backdrop"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="report-modal-success">
            <div className="report-modal-icon">✓</div>
            <div className="report-modal-title">Report Submitted</div>
            <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.7rem', lineHeight: 1.5, marginTop: '0.8rem' }}>
              Thank you for helping keep DASHR safe. Our team will review this report and take action if needed.
            </p>
            <button className="btn btn-ghost btn-block" onClick={onClose} style={{ marginTop: '1.5rem' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="report-modal-header">
              <div>
                <div className="report-modal-title">Report User</div>
                <div className="report-modal-subtitle">
                  Reporting <strong>{reportedName}</strong>
                </div>
              </div>
              <button className="report-modal-close" onClick={onClose} aria-label="Close">×</button>
            </div>

            {error && <div className="notice notice-r" style={{ margin: '0 1.2rem', fontSize: '0.68rem' }}>{error}</div>}

            <div className="report-modal-body">
              <div className="type-label" style={{ marginBottom: '0.6rem' }}>What happened?</div>
              <div className="report-reason-grid">
                {REASONS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`report-reason-btn ${reason === key ? 'active' : ''}`}
                    onClick={() => setReason(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="inp-wrap" data-label="Details (optional)" style={{ marginTop: '1.2rem' }}>
                <textarea
                  className="inp"
                  placeholder="Tell us more about what happened..."
                  rows={3}
                  style={{ resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                />
              </div>

              <div style={{ fontSize: '0.6rem', fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: '0.4rem' }}>
                {notes.length}/1000
              </div>
            </div>

            <div className="report-modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleSubmit}
                disabled={loading || !reason}
              >
                {loading ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
