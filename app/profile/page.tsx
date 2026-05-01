'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import Nav from '@/components/Nav';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<{
    id: string; name: string; email: string; phone: string;
    role: string; strikes: number; pending_agent?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Phone editing
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    async function load() {
      const user = await getUserSafe(supabase);
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({ ...data, email: user.email || '' });
        setPhoneInput(data.phone || '');
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function savePhone() {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length !== 10) { setPhoneMsg('Enter a valid 10-digit number'); return; }
    setPhoneSaving(true);
    setPhoneMsg('');
    const { error } = await supabase.from('users').update({ phone: digits }).eq('id', profile!.id);
    if (error) { setPhoneMsg('Failed to save: ' + error.message); }
    else {
      setProfile((p) => p ? { ...p, phone: digits } : null);
      setPhoneMsg('✓ Phone updated');
      setEditingPhone(false);
      setTimeout(() => setPhoneMsg(''), 3000);
    }
    setPhoneSaving(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') { setDeleteError('Type DELETE to confirm'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/profile/delete', { method: 'POST' });
      const data = await res.json();
      if (!data.ok) { setDeleteError(data.error || 'Failed to delete account'); setDeleting(false); return; }
      await supabase.auth.signOut();
      router.push('/');
    } catch {
      setDeleteError('Network error. Try again.');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <Nav role={profile.role as 'customer'} userName={profile.name} isLoading={false} />

      <div className="page-enter" style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '40rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="sec-label">User Profile</div>
          <div className="type-h1">My <span style={{ color: 'var(--yellow)' }}>Account.</span></div>
        </div>

        <div className="order-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '0.14rem solid #333', paddingBottom: '1.5rem' }}>
            <div className="nav-user-avatar" style={{ width: '4rem', height: '4rem', fontSize: '1.5rem' }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="type-h2" style={{ color: 'var(--white)', letterSpacing: '0.02em', textTransform: 'none' }}>{profile.name}</div>
              <div className="type-label" style={{ marginTop: '0.3rem' }}>
                {profile.pending_agent ? 'CUSTOMER · DASHER APPLICATION PENDING' : profile.role.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {/* Email */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.2rem' }}>Email</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>{profile.email}</div>
            </div>

            {/* Phone — editable */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.4rem' }}>Phone Number</div>
              {editingPhone ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input
                    className="inp"
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="10-digit number"
                    style={{ flex: 1, minWidth: '10rem' }}
                    maxLength={15}
                  />
                  <button className="btn btn-primary btn-sm" onClick={savePhone} disabled={phoneSaving}>
                    {phoneSaving ? <span className="spinner" style={{ width: '0.7rem', height: '0.7rem' }} /> : 'Save'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPhone(false); setPhoneInput(profile.phone || ''); }}>Cancel</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>
                    {profile.phone ? `+91 ${profile.phone}` : <span style={{ color: 'var(--muted)' }}>No phone added</span>}
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditingPhone(true)} style={{ fontSize: '0.58rem' }}>Edit</button>
                </div>
              )}
              {phoneMsg && (
                <div className={`notice ${phoneMsg.startsWith('✓') ? 'notice-g' : 'notice-r'}`} style={{ marginTop: '0.5rem', fontSize: '0.65rem' }}>
                  {phoneMsg}
                </div>
              )}
              {!profile.phone && !editingPhone && (
                <div className="notice notice-y" style={{ marginTop: '0.5rem', fontSize: '0.62rem' }}>
                  ⚠ Add a phone number to place orders above ₹200
                </div>
              )}
            </div>

            {/* Agent strikes */}
            {profile.role === 'agent' && (
              <div>
                <div className="type-label" style={{ marginBottom: '0.4rem' }}>Account Status</div>
                {profile.strikes > 0 ? (
                  <div className="strike-row" style={{ marginTop: 0 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`strike-dot ${i < profile.strikes ? 'hit' : ''}`} style={{ width: '0.8rem', height: '0.8rem' }} />
                    ))}
                    <span style={{ marginLeft: '0.5rem', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--danger)' }}>
                      {profile.strikes} Strikes
                    </span>
                  </div>
                ) : (
                  <span className="badge badge-gf">Good Standing</span>
                )}
              </div>
            )}

            {/* Become a dasher */}
            {profile.role === 'customer' && !profile.pending_agent && (
              <div style={{ paddingTop: '0.5rem', borderTop: '0.12rem solid #333' }}>
                <div className="type-label" style={{ marginBottom: '0.6rem' }}>Dasher Program</div>
                <Link href="/onboarding?role=agent&upgrade=true" className="btn btn-ghost btn-sm">
                  ⚡ Become a Dasher →
                </Link>
                <div className="type-label" style={{ marginTop: '0.4rem', fontSize: '0.55rem' }}>Earn commissions by delivering for fellow students</div>
              </div>
            )}

            {profile.pending_agent && (
              <div className="notice notice-y" style={{ fontSize: '0.68rem' }}>
                ⏳ Your dasher application is pending admin review. Usually approved within 24 hours.
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '0.14rem solid #333', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button className="btn btn-danger btn-block" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <span className="spinner" /> : 'Sign Out'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', boxShadow: '0.2rem 0.2rem 0 var(--danger)', fontSize: '0.6rem' }}
              onClick={() => setShowDelete(true)}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDelete && (
        <div
          className="rating-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDelete(false); }}
        >
          <div className="rating-modal" style={{ borderColor: 'var(--danger)', boxShadow: '0.8rem 0.8rem 0 var(--danger)', maxWidth: '22rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💀</div>
              <div className="type-h2" style={{ color: 'var(--danger)' }}>Delete Account</div>
              <div className="type-label" style={{ marginTop: '0.5rem', fontSize: '0.62rem', lineHeight: 1.6 }}>
                This will cancel your active orders, remove your profile, and sign you out. This cannot be undone.
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div className="type-label" style={{ marginBottom: '0.5rem', fontSize: '0.6rem' }}>Type <strong style={{ color: 'var(--danger)', letterSpacing: '0.1em' }}>DELETE</strong> to confirm</div>
              <input
                className="inp"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value.toUpperCase())}
                placeholder="DELETE"
                style={{ borderColor: deleteConfirm === 'DELETE' ? 'var(--danger)' : undefined }}
              />
            </div>
            {deleteError && <div className="notice notice-r" style={{ marginBottom: '1rem', fontSize: '0.65rem' }}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowDelete(false); setDeleteConfirm(''); setDeleteError(''); }}>Cancel</button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'DELETE'}
              >
                {deleting ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
