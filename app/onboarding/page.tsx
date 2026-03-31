'use client';
export const dynamic = 'force-dynamic';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const isPending = params.get('pending') === 'true';
  const defaultRole = params.get('role') === 'agent' ? 'agent' : 'customer';

  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'basic' | 'agent-id'>('basic');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'customer' | 'agent'>(defaultRole);
  const [srmId, setSrmId] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isPending) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '28rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', fontSize: '2rem' }}>DASHR<sup>SRM</sup></div>
          <div className="type-h1">Verification<br /><span style={{ color: 'var(--yellow)' }}>Pending.</span></div>
          <div className="notice notice-y">
            Your SRM ID card is being reviewed by our team. You&apos;ll be notified once approved — usually within 24 hours.
          </div>
          <a href="/order" className="btn btn-ghost btn-block">Order Something While You Wait</a>
        </div>
      </div>
    );
  }

  async function submitBasic() {
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { error: upsertError } = await supabase.from('users').upsert({
      id: user.id,
      name: name.trim(),
      email: user.email,
      role,
      is_verified: role === 'customer',
    });

    if (upsertError) { setError(upsertError.message); setLoading(false); return; }

    if (role === 'agent') {
      setStep('agent-id');
    } else {
      router.push('/order');
    }
    setLoading(false);
  }

  async function submitAgentId() {
    if (!srmId.trim() || !idFile) { setError('SRM ID and ID card photo are required'); return; }
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const ext = idFile.name.split('.').pop();
    const filePath = `${user.id}/id-card.${ext}`;
    const { error: uploadError } = await supabase.storage.from('id-cards').upload(filePath, idFile, { upsert: true });
    if (uploadError) { setError('Upload failed: ' + uploadError.message); setLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('id-cards').getPublicUrl(filePath);

    const res = await fetch('/api/agent/verify-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, srmId, idCardUrl: publicUrl, expectedName: name }),
    });
    const result = await res.json();

    if (!result.ok) {
      setError(result.error || 'ID verification failed — name on ID must match your registered name.');
      setLoading(false);
      return;
    }

    await supabase.from('users').update({
      srm_id: srmId.trim(),
      id_card_url: publicUrl,
      is_verified: false,
    }).eq('id', user.id);

    router.push('/onboarding?pending=true');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="nav-logo" style={{ fontSize: '1.8rem' }}>DASHR<sup>SRM</sup></div>

        {step === 'basic' ? (
          <>
            <div>
              <div className="login-h">Welcome<br /><span style={{ color: 'var(--yellow)' }}>Aboard.</span></div>
              <div className="login-sub" style={{ marginTop: '0.5rem' }}>Tell us who you are</div>
            </div>

            {error && <div className="notice notice-r">{error}</div>}

            <div className="inp-wrap" data-label="Full Name">
              <input className="inp" placeholder="As on your SRM ID card" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <div className="type-label" style={{ marginBottom: '0.75rem' }}>I want to...</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  className={`zone-btn ${role === 'customer' ? 'active' : ''}`}
                  onClick={() => setRole('customer')}
                  style={{ padding: '1rem' }}
                >
                  🛒 Order<br /><span style={{ fontSize: '0.55rem' }}>as customer</span>
                </button>
                <button
                  className={`zone-btn ${role === 'agent' ? 'active' : ''}`}
                  onClick={() => setRole('agent')}
                  style={{ padding: '1rem' }}
                >
                  🏃 Dash<br /><span style={{ fontSize: '0.55rem' }}>earn commission</span>
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={submitBasic} disabled={loading}>
              {loading ? <span className="spinner" /> : role === 'agent' ? 'Next: Verify ID →' : 'Start Ordering →'}
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="login-h">Dasher<br /><span style={{ color: 'var(--yellow)' }}>Setup.</span></div>
              <div className="login-sub" style={{ marginTop: '0.5rem' }}>ID verification required</div>
            </div>

            {error && <div className="notice notice-r">{error}</div>}

            <div className="notice notice-y">
              ⚠ Name on ID card must exactly match: <strong>{name}</strong>
            </div>

            <div className="inp-wrap" data-label="SRM Registration ID">
              <input className="inp" placeholder="RA2111026010244" value={srmId} onChange={(e) => setSrmId(e.target.value)} />
            </div>

            <div
              className="inp-wrap"
              data-label="ID Card Photo"
              style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
              <div className="inp" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {idFile ? `📎 ${idFile.name}` : '📷 Click to upload ID card image'}
              </div>
            </div>

            <div className="notice notice-y" style={{ fontSize: '0.65rem' }}>
              Your ID card will be reviewed by admin for approval. This typically takes under 24 hours.
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={submitAgentId} disabled={loading || !idFile || !srmId}>
              {loading ? <span className="spinner" /> : 'Submit for Verification →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
