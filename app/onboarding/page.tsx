'use client';
export const dynamic = 'force-dynamic';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const isPending = params.get('pending') === 'true';
  const defaultRole = params.get('role') === 'agent' ? 'agent' : 'customer';

  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'basic' | 'agent-id'>('basic');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'agent'>(defaultRole);
  const [srmId, setSrmId] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);

  if (isPending) {
    return (
      <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '28rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', fontSize: '2rem' }}>DASHR<sup>SRM</sup></div>
          <div className="type-h1">Verification<br /><span style={{ color: 'var(--yellow)' }}>Pending.</span></div>
          <div className="notice notice-y">
            Your SRM ID card is being reviewed. You will be notified once approved — usually within 24 hours.
          </div>
          <a href="/order" className="btn btn-ghost btn-block">Order Something While You Wait</a>
        </div>
      </div>
    );
  }

  async function submitBasic() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    if (!policyAccepted) { setError('You must accept the policies to continue'); return; }
    setLoading(true);
    setError('');

    const user = await getUserSafe(supabase);
    if (!user) { router.push('/login'); return; }

    const { error: upsertError } = await supabase.from('users').upsert({
      id: user.id,
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: user.email,
      role,
      is_verified: role === 'customer',
      accepted_policy_version: '1.0',
      accepted_policy_at: new Date().toISOString(),
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

    const user = await getUserSafe(supabase);
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
      setError(result.error || 'ID verification failed.');
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
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
        <div className="nav-logo" style={{ fontSize: '1.8rem' }}>DASHR<sup>SRM</sup></div>

        {step === 'basic' ? (
          <>
            <div>
              <div className="login-h">Welcome<br /><span style={{ color: 'var(--yellow)' }}>Aboard.</span></div>
              <div className="login-sub" style={{ marginTop: '0.5rem' }}>Tell us who you are</div>
            </div>

            {error && <div className="notice notice-r">{error}</div>}

            <div className="inp-wrap" data-label="Full Name">
              <input className="inp" id="onboard-name" placeholder="As on your SRM ID card" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="inp-wrap" data-label="Phone Number">
              <input className="inp" id="onboard-phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <div className="type-label" style={{ marginBottom: '0.75rem' }}>I want to...</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button className={`zone-btn ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')} style={{ padding: '1rem' }}>
                  ORDER<br /><span style={{ fontSize: '0.55rem', fontWeight: 400 }}>as customer</span>
                </button>
                <button className={`zone-btn ${role === 'agent' ? 'active' : ''}`} onClick={() => setRole('agent')} style={{ padding: '1rem' }}>
                  DASH<br /><span style={{ fontSize: '0.55rem', fontWeight: 400 }}>earn commission</span>
                </button>
              </div>
            </div>

            <label className="policy-check">
              <input
                type="checkbox"
                checked={policyAccepted}
                onChange={(e) => setPolicyAccepted(e.target.checked)}
                id="policy-checkbox"
              />
              <span className="policy-check-text">
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and{' '}
                <a href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>.
                I understand that my phone number will be shared with dashers for delivery coordination.
              </span>
            </label>

            <button className="btn btn-primary btn-lg btn-block" id="onboard-submit" onClick={submitBasic} disabled={loading || !policyAccepted}>
              {loading ? <span className="spinner" /> : role === 'agent' ? 'Next: Verify ID' : 'Start Ordering'}
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
              Name on ID card must exactly match: <strong>{name}</strong>
            </div>

            <div className="inp-wrap" data-label="SRM Registration ID">
              <input className="inp" id="onboard-srmid" placeholder="RA2111026010244" value={srmId} onChange={(e) => setSrmId(e.target.value)} />
            </div>

            <div
              className="inp-wrap"
              data-label="ID Card Photo"
              style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
              <div className="inp" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {idFile ? idFile.name : 'Click to upload ID card image'}
              </div>
            </div>

            <div className="notice notice-y" style={{ fontSize: '0.65rem' }}>
              Your ID card will be reviewed by admin for approval. This typically takes under 24 hours.
            </div>

            <button className="btn btn-primary btn-lg btn-block" id="onboard-agent-submit" onClick={submitAgentId} disabled={loading || !idFile || !srmId}>
              {loading ? <span className="spinner" /> : 'Submit for Verification'}
            </button>

            <button className="btn btn-ghost btn-block" onClick={() => setStep('basic')} style={{ fontSize: '0.7rem' }}>
              Back
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
