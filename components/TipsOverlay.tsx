'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

interface TipsOverlayProps {
  userId: string;
  role: 'customer' | 'agent';
}

const CUSTOMER_TIPS = [
  { icon: '📦', title: 'Place an Order', body: 'Describe what you need, where to pick it up, and where to deliver it. Be specific — your dasher will thank you.' },
  { icon: '💰', title: 'Set a Fair Commission', body: 'Higher commission = faster pickup. The minimum is set per zone. Push it up if you need it quick.' },
  { icon: '📱', title: 'Track in Real Time', body: 'Watch your order status update live. No need to refresh — it happens automatically.' },
  { icon: '⭐', title: 'Rate Your Dasher', body: 'After delivery, you\'ll get a prompt to rate. It matters — it keeps the community accountable.' },
  { icon: '🚫', title: 'No Phone? No Problem... Mostly', body: 'You can browse without a phone number, but orders above ₹200 need one. Add it in your profile.' },
];

const AGENT_TIPS = [
  { icon: '🟢', title: 'Go Online to See Orders', body: 'Toggle "On Duty" in the nav to start receiving the live order feed. No toggle = no orders.' },
  { icon: '⚡', title: 'Pick Orders That Make Sense', body: 'You can see the commission before accepting. Only take what\'s worth your time.' },
  { icon: '✅', title: 'Mark Picked Up & Delivered', body: 'Update the status when you pick up the item and again when you deliver it. This releases payment.' },
  { icon: '📊', title: 'Track Your Earnings', body: 'Check the Ledger tab for your full earnings history, broken down by week.' },
  { icon: '⚠️', title: 'Strikes & Bans', body: 'No-shows and cancellation abuse earn strikes. 3 strikes and you\'re suspended. Stay reliable.' },
];

export default function TipsOverlay({ userId, role }: TipsOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const supabase = createClient();

  const tips = role === 'agent' ? AGENT_TIPS : CUSTOMER_TIPS;
  const tip = tips[current];
  const isLast = current === tips.length - 1;

  async function dismiss() {
    setDismissing(true);
    await supabase.from('users').update({ has_seen_tips: true }).eq('id', userId);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div style={{
        background: 'var(--surf)',
        border: '0.22rem solid var(--yellow)',
        boxShadow: '0.8rem 0.8rem 0 var(--yellow)',
        width: '100%', maxWidth: '26rem',
        animation: 'fadeInUp 0.3s cubic-bezier(0.23,1,0.32,1)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--yellow)', color: 'var(--ink)',
          padding: '0.8rem 1.4rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {role === 'agent' ? '⚡ Dasher Guide' : '📦 Quick Start'} · {current + 1}/{tips.length}
          </div>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Skip All
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: '0.18rem', background: '#2a2a2a' }}>
          <div style={{
            height: '100%',
            width: `${((current + 1) / tips.length) * 100}%`,
            background: 'var(--yellow)',
            transition: 'width 0.35s cubic-bezier(0.23,1,0.32,1)',
          }} />
        </div>

        {/* Tip content */}
        <div style={{ padding: '2.5rem 1.8rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1 }}>{tip.icon}</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--white)', marginBottom: '0.8rem', letterSpacing: '0.03em' }}>
            {tip.title}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#bbb', lineHeight: 1.8, letterSpacing: '0.02em' }}>
            {tip.body}
          </div>
        </div>

        {/* Dot indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', paddingBottom: '0.4rem' }}>
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? '1.6rem' : '0.45rem',
                height: '0.45rem',
                background: i === current ? 'var(--yellow)' : '#444',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.23,1,0.32,1)',
              }}
              aria-label={`Tip ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', padding: '0.8rem 1.4rem 1.4rem' }}>
          {current > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setCurrent((c) => c - 1)}>← Back</button>
          )}
          {isLast ? (
            <button className="btn btn-primary btn-sm" style={{ flex: 3 }} onClick={dismiss} disabled={dismissing}>
              {dismissing ? <span className="spinner" style={{ width: '0.7rem', height: '0.7rem' }} /> : "Let's Go! →"}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" style={{ flex: 3 }} onClick={() => setCurrent((c) => c + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
