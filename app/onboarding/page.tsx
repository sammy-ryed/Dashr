'use client';
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import { useCollege } from '@/lib/college-context';

// ── Premium toggle switch ────────────────────────────────────
function Toggle({
  id,
  checked,
  onChange,
  label,
  sub,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.9rem 1rem',
        background: checked ? 'rgba(233,181,11,0.07)' : 'var(--surf)',
        border: `0.14rem solid ${checked ? 'var(--yellow)' : '#2a2a2a'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
    >
      <div>
        <div style={{ fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--white)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
        />
        {/* Track */}
        <div style={{
          width: '2.4rem',
          height: '1.3rem',
          background: checked ? 'var(--yellow)' : '#333',
          borderRadius: '999px',
          transition: 'background 0.2s',
          position: 'relative',
        }}>
          {/* Thumb */}
          <div style={{
            position: 'absolute',
            top: '0.15rem',
            left: checked ? '1.25rem' : '0.15rem',
            width: '1rem',
            height: '1rem',
            background: checked ? 'var(--ink)' : '#666',
            borderRadius: '50%',
            transition: 'left 0.2s, background 0.2s',
          }} />
        </div>
      </div>
    </label>
  );
}

// ── Gender chip selector ─────────────────────────────────────
type Gender = 'male' | 'female' | 'other';

function GenderChips({ value, onChange }: { value: Gender | ''; onChange: (g: Gender) => void }) {
  const options: { id: Gender; label: string; emoji: string }[] = [
    { id: 'male',   label: 'Male',   emoji: '♂' },
    { id: 'female', label: 'Female', emoji: '♀' },
    { id: 'other',  label: 'Other',  emoji: '◎' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          style={{
            padding: '0.8rem 0.5rem',
            background: value === o.id ? 'rgba(233,181,11,0.12)' : 'var(--surf)',
            border: `0.14rem solid ${value === o.id ? 'var(--yellow)' : '#2a2a2a'}`,
            color: value === o.id ? 'var(--yellow)' : 'var(--muted)',
            fontFamily: 'var(--font)',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>{o.emoji}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Year selector ────────────────────────────────────────────
const YEAR_OPTIONS = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
  { value: 5, label: '5th Year' },
];

function YearChips({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      {YEAR_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            padding: '0.5rem 0.8rem',
            background: value === o.value ? 'rgba(233,181,11,0.12)' : 'var(--surf)',
            border: `0.14rem solid ${value === o.value ? 'var(--yellow)' : '#2a2a2a'}`,
            color: value === o.value ? 'var(--yellow)' : 'var(--muted)',
            fontFamily: 'var(--mono)',
            fontSize: '0.65rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            letterSpacing: '0.04em',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Section label ────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)',
      fontSize: '0.55rem',
      color: 'var(--yellow)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      marginBottom: '0.5rem',
    }}>
      {children}
    </div>
  );
}

// ── Main onboarding component ────────────────────────────────
function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { college } = useCollege();
  const isPending = params.get('pending') === 'true';
  const isUpgrade = params.get('upgrade') === 'true';
  const defaultRole = (params.get('role') === 'agent' || isUpgrade) ? 'agent' : 'customer';

  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'basic' | 'agent-id'>('basic');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'agent'>(defaultRole);
  const [gender, setGender] = useState<Gender | ''>('');
  const [preferFemaleDashr, setPreferFemaleDashr] = useState(false);
  const [femaleOnlyDeliveries, setFemaleOnlyDeliveries] = useState(false);
  const [yearOfStudy, setYearOfStudy] = useState<number>(0);
  const [seniorOnlyDeliveries, setSeniorOnlyDeliveries] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [prefilling, setPrefilling] = useState(isUpgrade);

  // Reset senior-only toggle if year drops below 3
  useEffect(() => {
    if (yearOfStudy < 3) setSeniorOnlyDeliveries(false);
  }, [yearOfStudy]);

  // Reset prefer-female-dashr and female-only-deliveries if gender changes away from female
  useEffect(() => {
    if (gender !== 'female') {
      setPreferFemaleDashr(false);
      setFemaleOnlyDeliveries(false);
    }
  }, [gender]);

  // Upgrade flow: pre-fill from existing profile
  useEffect(() => {
    if (!isUpgrade) return;
    async function prefill() {
      const user = await getUserSafe(supabase);
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('users')
        .select('name, phone, accepted_policy_version')
        .eq('id', user.id).single();
      if (data) {
        setName(data.name || '');
        setPhone(data.phone || '');
        if (data.accepted_policy_version) setPolicyAccepted(true);
      }
      setPrefilling(false);
    }
    prefill();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pending screen ─────────────────────────────────────────
  if (isPending) {
    return (
      <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '28rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="nav-logo" style={{ justifyContent: 'center', fontSize: '2rem' }}>
            DASHR<sup>{college.name}</sup>
          </div>
          <div className="type-h1">Verification<br /><span style={{ color: 'var(--yellow)' }}>Pending.</span></div>
          <div className="notice notice-y">
            Your {college.studentIdLabel} is being reviewed. You will be notified once approved — usually within 24 hours.
          </div>
          <a href="/order" className="btn btn-ghost btn-block">Order Something While You Wait</a>
        </div>
      </div>
    );
  }

  if (prefilling) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  // ── Submit: basic step ─────────────────────────────────────
  async function submitBasic() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number'); return;
    }
    if (!gender) { setError('Please select your gender'); return; }
    if (!yearOfStudy) { setError('Please select your year of study'); return; }
    if (!policyAccepted) { setError('You must accept the policies to continue'); return; }
    setLoading(true);
    setError('');

    const user = await getUserSafe(supabase);
    if (!user) { router.push('/login'); return; }

    if (isUpgrade) {
      await supabase.from('users').update({
        pending_agent: true,
        accepted_policy_version: '1.0',
        accepted_policy_at: new Date().toISOString(),
        gender,
        prefer_female_dashr: preferFemaleDashr,
        female_only_deliveries: femaleOnlyDeliveries,
        year_of_study: yearOfStudy,
        senior_only_deliveries: seniorOnlyDeliveries,
      }).eq('id', user.id);
      setStep('agent-id');
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase.from('users').upsert({
      id: user.id,
      name: name.trim(),
      phone: phone.replace(/\D/g, ''),
      email: user.email,
      role: 'customer',
      pending_agent: role === 'agent',
      is_verified: true,
      accepted_policy_version: '1.0',
      accepted_policy_at: new Date().toISOString(),
      gender,
      prefer_female_dashr: preferFemaleDashr,
      female_only_deliveries: femaleOnlyDeliveries,
      year_of_study: yearOfStudy,
      senior_only_deliveries: seniorOnlyDeliveries,
      college_slug: college.slug,
    });

    if (upsertError) { setError(upsertError.message); setLoading(false); return; }
    if (role === 'agent') { setStep('agent-id'); } else { router.push('/order'); }
    setLoading(false);
  }

  // ── Submit: agent ID step ──────────────────────────────────
  async function submitAgentId() {
    if (!studentId.trim() || !idFile) {
      setError(`${college.studentIdLabel} and ID card photo are required`); return;
    }
    setLoading(true);
    setError('');

    const user = await getUserSafe(supabase);
    if (!user) { router.push('/login'); return; }

    const ext = idFile.name.split('.').pop();
    const filePath = `${user.id}/id-card.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('id-cards').upload(filePath, idFile, { upsert: true });
    if (uploadError) { setError('Upload failed: ' + uploadError.message); setLoading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('id-cards').getPublicUrl(filePath);

    const res = await fetch('/api/agent/verify-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, srmId: studentId, idCardUrl: publicUrl, expectedName: name }),
    });
    const result = await res.json();

    if (!result.ok) {
      setError(result.error || 'ID verification failed.');
      setLoading(false);
      return;
    }

    await supabase.from('users').update({
      srm_id: studentId.trim(),
      id_card_url: publicUrl,
      is_verified: true,
      pending_agent: true,
    }).eq('id', user.id);

    router.push('/onboarding?pending=true');
    setLoading(false);
  }

  // ── Render ─────────────────────────────────────────────────
  const isSeniorAgent = role === 'agent' && yearOfStudy >= 3;

  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
        <div className="nav-logo" style={{ fontSize: '1.8rem' }}>DASHR<sup>{college.name}</sup></div>

        {step === 'basic' ? (
          <>
            <div>
              <div className="login-h">Welcome<br /><span style={{ color: 'var(--yellow)' }}>Aboard.</span></div>
              <div className="login-sub" style={{ marginTop: '0.5rem' }}>Tell us who you are</div>
            </div>

            {error && <div className="notice notice-r">{error}</div>}

            {/* Name */}
            <div>
              <SectionLabel>Full Name</SectionLabel>
              <div className="inp-wrap" data-label="Full Name">
                <input className="inp" id="onboard-name" placeholder={`As on your ${college.studentIdLabel}`} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            {/* Phone */}
            <div>
              <SectionLabel>Phone Number</SectionLabel>
              <div className="inp-wrap" data-label="Phone Number">
                <input className="inp" id="onboard-phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {/* Gender */}
            <div>
              <SectionLabel>Gender</SectionLabel>
              <GenderChips value={gender} onChange={setGender} />
            </div>

            {/* Female dashr preference — only shown to female customers */}
            {gender === 'female' && role === 'customer' && (
              <div style={{ animation: 'fadeInUp 0.25s ease' }}>
                <SectionLabel>Delivery Preference</SectionLabel>
                <Toggle
                  id="prefer-female-dashr"
                  checked={preferFemaleDashr}
                  onChange={setPreferFemaleDashr}
                  label="Prefer a female dashr"
                  sub="Since the dasher gets your number, you can request a female dasher. Toggle anytime in profile."
                />
              </div>
            )}

            {/* Year of study */}
            <div>
              <SectionLabel>Year of Study</SectionLabel>
              <YearChips value={yearOfStudy} onChange={setYearOfStudy} />
            </div>

            {/* Role selector */}
            <div>
              <SectionLabel>I want to...</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button className={`zone-btn ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')} style={{ padding: '1rem' }}>
                  ORDER<br /><span style={{ fontSize: '0.55rem', fontWeight: 400 }}>as customer</span>
                </button>
                <button className={`zone-btn ${role === 'agent' ? 'active' : ''}`} onClick={() => setRole('agent')} style={{ padding: '1rem' }}>
                  DASH<br /><span style={{ fontSize: '0.55rem', fontWeight: 400 }}>earn commission</span>
                </button>
              </div>
            </div>

            {/* Senior-only toggle — only shown to 3rd year+ dashers */}
            {isSeniorAgent && (
              <div style={{ animation: 'fadeInUp 0.25s ease' }}>
                <SectionLabel>Senior Dasher Mode</SectionLabel>
                <Toggle
                  id="senior-only-deliveries"
                  checked={seniorOnlyDeliveries}
                  onChange={setSeniorOnlyDeliveries}
                  label="Only accept junior orders"
                  sub="As a 3rd year+, you can choose to only run for 1st/2nd year students. Toggle anytime in profile."
                />
              </div>
            )}

            {/* Female-only deliveries — only shown to female dashers */}
            {gender === 'female' && role === 'agent' && (
              <div style={{ animation: 'fadeInUp 0.25s ease' }}>
                <SectionLabel>Dasher Preference</SectionLabel>
                <Toggle
                  id="female-only-deliveries"
                  checked={femaleOnlyDeliveries}
                  onChange={setFemaleOnlyDeliveries}
                  label="Female customers only"
                  sub="Only accept orders from female customers. Your number stays between women. Toggle anytime in profile."
                />
              </div>
            )}

            {/* Policy */}
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

            <div>
              <SectionLabel>{college.studentIdLabel}</SectionLabel>
              <div className="inp-wrap" data-label={college.studentIdLabel}>
                <input
                  className="inp"
                  id="onboard-studentid"
                  placeholder={college.slug === 'srm' ? 'RA2111026010244' : 'MAHE2024XXXX'}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>

            <div>
              <SectionLabel>ID Card Photo</SectionLabel>
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
            </div>

            <div className="notice notice-y" style={{ fontSize: '0.65rem' }}>
              Your ID card will be reviewed by admin for approval. This typically takes under 24 hours.
            </div>

            <button className="btn btn-primary btn-lg btn-block" id="onboard-agent-submit" onClick={submitAgentId} disabled={loading || !idFile || !studentId}>
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
