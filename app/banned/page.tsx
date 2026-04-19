'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';

interface BanInfo {
  id: string;
  reason: string;
  ban_type: 'temporary' | 'permanent';
  expires_at: string | null;
  created_at: string;
}

export default function BannedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ban, setBan] = useState<BanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState('');
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState('');
  const [appealing, setAppealing] = useState(false);
  const [existingAppeal, setExistingAppeal] = useState(false);

  useEffect(() => {
    async function init() {
      const user = await getUserSafe(supabase);
      if (!user) { router.push('/login'); return; }

      // Get active ban
      const { data: bans } = await supabase
        .from('bans')
        .select('id, reason, ban_type, expires_at, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!bans || bans.length === 0) {
        // Not actually banned — redirect
        router.push('/order');
        return;
      }

      setBan(bans[0] as BanInfo);

      // Check for existing appeal
      const { count } = await supabase
        .from('appeals')
        .select('id', { count: 'exact', head: true })
        .eq('ban_id', bans[0].id);

      if ((count || 0) > 0) setExistingAppeal(true);
      setLoading(false);
    }
    init();
  }, []);

  async function submitAppeal() {
    if (!ban || !appealText.trim() || appealText.trim().length < 20) {
      setAppealError('Please explain your situation in at least 20 characters.');
      return;
    }
    setAppealing(true);
    setAppealError('');

    try {
      const res = await fetch('/api/appeals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banId: ban.id,
          appealText: appealText.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAppealSent(true);
      } else {
        setAppealError(data.error || 'Failed to submit appeal');
      }
    } catch {
      setAppealError('Network error. Try again.');
    }
    setAppealing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  if (!ban) return null;

  const isTemporary = ban.ban_type === 'temporary' && ban.expires_at;
  const expiryDate = isTemporary ? new Date(ban.expires_at!).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : null;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '32rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="nav-logo" style={{ justifyContent: 'center', fontSize: '2rem' }}>DASHR<sup>SRM</sup></div>

        <div style={{ textAlign: 'center' }}>
          <div className="type-h1" style={{ fontSize: '1.6rem' }}>
            Account<br /><span style={{ color: 'var(--danger, #e53935)' }}>Suspended.</span>
          </div>
        </div>

        <div className="notice notice-r" style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
            {isTemporary ? 'Temporary Suspension' : 'Account Suspended'}
          </div>
          <div style={{ fontSize: '0.68rem', lineHeight: 1.6 }}>
            <strong>Reason:</strong> {ban.reason}
          </div>
          {isTemporary && expiryDate && (
            <div style={{ fontSize: '0.68rem', lineHeight: 1.6, marginTop: '0.3rem' }}>
              <strong>Expires:</strong> {expiryDate}
            </div>
          )}
          {!isTemporary && (
            <div style={{ fontSize: '0.68rem', lineHeight: 1.6, marginTop: '0.3rem', color: 'var(--muted)' }}>
              This suspension is indefinite. You may submit an appeal below.
            </div>
          )}
        </div>

        {/* Appeal section */}
        {existingAppeal || appealSent ? (
          <div className="notice notice-y">
            <div style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.3rem' }}>Appeal Submitted</div>
            <div style={{ fontSize: '0.68rem', lineHeight: 1.5 }}>
              Your appeal is being reviewed. You&apos;ll receive a notification when there&apos;s an update. This usually takes 1–3 business days.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="type-label">Submit an Appeal</div>
            <div style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--muted)', lineHeight: 1.5 }}>
              If you believe this was a mistake, explain your side. Be honest and specific — appeals are reviewed by a real person.
            </div>

            {appealError && <div className="notice notice-r" style={{ fontSize: '0.65rem' }}>{appealError}</div>}

            <div className="inp-wrap" data-label="Your Appeal">
              <textarea
                className="inp"
                placeholder="Explain what happened and why you think this suspension should be lifted..."
                rows={4}
                style={{ resize: 'none' }}
                value={appealText}
                onChange={(e) => setAppealText(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div style={{ fontSize: '0.58rem', fontFamily: 'var(--mono)', color: 'var(--muted)', textAlign: 'right' }}>
              {appealText.length}/2000
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={submitAppeal}
              disabled={appealing || appealText.trim().length < 20}
            >
              {appealing ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Submit Appeal'}
            </button>
          </div>
        )}

        <div style={{ borderTop: '0.12rem solid #2a2a2a', paddingTop: '1.2rem' }}>
          <button className="btn btn-ghost btn-block btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
