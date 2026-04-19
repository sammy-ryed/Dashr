'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';

type Mode = 'signin' | 'signup' | 'forgot';
type SignupStep = 'email' | 'otp' | 'password';
type ForgotStep = 'email' | 'otp';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Safely access search params to avoid hydration mismatch
  const resetDone = searchParams ? searchParams.get('reset') === 'done' : false;
  const errorParam = searchParams ? searchParams.get('error') : '';

  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('signin');
  const [signupStep, setSignupStep] = useState<SignupStep>('email');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam ? 'Session expired. Sign in again.' : '');
  const [success, setSuccess] = useState(resetDone ? 'Password reset. Sign in with your new password.' : '');

  function switchMode(m: Mode) {
    setMode(m);
    setSignupStep('email');
    setForgotStep('email');
    setError('');
    setSuccess('');
    setOtp('');
    setPassword('');
    setNewPassword('');
  }

  // ── SIGN IN ──────────────────────────────────────────────────
  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Wrong email or password.'
        : signInError.message);
      setLoading(false);
      return;
    }

    // Get user role for routing
    const user = await getUserSafe(supabase);
    if (!user) { router.push('/onboarding'); return; }

    const { data: profile } = await supabase.from('users').select('role, name, is_banned').eq('id', user.id).single();
    if (!profile?.name) { router.push('/onboarding'); return; }

    // Ban check — redirect suspended users
    if (profile.is_banned) { router.push('/banned'); return; }

    if (profile.role === 'admin') router.push('/admin');
    else if (profile.role === 'agent') router.push('/agent/dashboard');
    else router.push('/order');
  }

  // ── SIGN UP: Send OTP ────────────────────────────────────────
  async function sendSignupOtp() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); }
      else { setSignupStep('otp'); setSuccess(`Code sent to ${email.trim()}`); }
    } catch { setError('Network error.'); }
    setLoading(false);
  }

  // ── SIGN UP: Verify OTP → Password ──────────────────────────
  async function verifySignupOtp() {
    if (otp.length < 6) return;
    setSignupStep('password');
    setSuccess('Email verified. Set your password.');
    setError('');
  }

  // ── SIGN UP: Create Account ──────────────────────────────────
  async function createAccount() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp, password }),
      });
      const data = await res.json();

      if (!data.ok) { setError(data.error); setLoading(false); return; }

      // Sign in with the token
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: 'magiclink',
      });

      if (verifyError) { setError(verifyError.message); setLoading(false); return; }
      router.push('/onboarding');
    } catch { setError('Network error.'); }
    setLoading(false);
  }

  // ── FORGOT: Send OTP ─────────────────────────────────────────
  async function sendForgotOtp() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); }
      else { setForgotStep('otp'); setSuccess(`Code sent to ${email.trim()}`); }
    } catch { setError('Network error.'); }
    setLoading(false);
  }

  // ── FORGOT: Verify + Reset ───────────────────────────────────
  async function resetPassword() {
    if (otp.length < 6) return;
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp, newPassword }),
      });
      const data = await res.json();

      if (!data.ok) { setError(data.error); setLoading(false); return; }
      switchMode('signin');
      setSuccess('Password reset. Sign in with your new password.');
    } catch { setError('Network error.'); }
    setLoading(false);
  }

  return (
    <div className="page-enter" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="login-wrap" style={{ width: '100%', maxWidth: '64rem' }}>

        {/* Left panel — branding */}
        <div className="login-l">
          <div className="login-brand">DASHR.</div>
          <div className="login-tagline">
            Built by SRM students.<br />
            Run by SRM students.<br />
            For SRM students.
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-r">
          <div className="login-form">

            {/* ── SIGN IN MODE ──────────────────────────────── */}
            {mode === 'signin' && (
              <>
                <div>
                  <div className="login-h">Sign <span>In.</span></div>
                  <div className="login-sub" style={{ marginTop: '0.5rem' }}>Email + Password</div>
                </div>

                {error && <div className="notice notice-r">{error}</div>}
                {success && <div className="notice notice-g">{success}</div>}

                <div className="inp-wrap" data-label="Email">
                  <input
                    className="inp"
                    id="login-email"
                    type="email"
                    placeholder="bhadu@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && document.getElementById('login-password')?.focus()}
                  />
                </div>

                <div className="inp-wrap" data-label="Password">
                  <input
                    className="inp"
                    id="login-password"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg btn-block"
                  id="signin-btn"
                  onClick={handleSignIn}
                  disabled={loading || !email.trim() || !password}
                >
                  {loading ? <span className="spinner" /> : 'Sign In'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    className="login-foot"
                    onClick={() => switchMode('forgot')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                  <button
                    className="login-foot"
                    onClick={() => switchMode('signup')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    New here? <span style={{ color: 'var(--yellow)' }}>Create account</span>
                  </button>
                </div>
              </>
            )}

            {/* ── SIGN UP MODE ──────────────────────────────── */}
            {mode === 'signup' && (
              <>
                <div>
                  <div className="login-h">Create <span>Account.</span></div>
                  <div className="login-sub" style={{ marginTop: '0.5rem' }}>
                    {signupStep === 'email' && 'Verify your email first'}
                    {signupStep === 'otp' && 'Check your inbox'}
                    {signupStep === 'password' && 'Set your password'}
                  </div>
                </div>

                {error && <div className="notice notice-r">{error}</div>}
                {success && <div className="notice notice-g">{success}</div>}

                {signupStep === 'email' && (
                  <>
                    <div className="inp-wrap" data-label="Email">
                      <input
                        className="inp"
                        id="signup-email"
                        type="email"
                        placeholder="bhadu@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendSignupOtp()}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={sendSignupOtp}
                      disabled={loading || !email.trim()}
                    >
                      {loading ? <span className="spinner" /> : 'Send Verification Code'}
                    </button>
                  </>
                )}

                {signupStep === 'otp' && (
                  <>
                    <div className="inp-wrap" data-label="6-Digit Code">
                      <input
                        className="inp"
                        id="signup-otp"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => e.key === 'Enter' && verifySignupOtp()}
                        autoFocus
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={verifySignupOtp}
                      disabled={otp.length < 6}
                    >
                      Verify Code
                    </button>
                    <button className="btn btn-ghost btn-block btn-sm" onClick={sendSignupOtp} disabled={loading}>
                      Resend Code
                    </button>
                  </>
                )}

                {signupStep === 'password' && (
                  <>
                    <div className="inp-wrap" data-label="Set Password">
                      <input
                        className="inp"
                        id="signup-password"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createAccount()}
                        autoFocus
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={createAccount}
                      disabled={loading || password.length < 8}
                    >
                      {loading ? <span className="spinner" /> : 'Create Account'}
                    </button>
                  </>
                )}

                <button
                  className="login-foot"
                  onClick={() => switchMode('signin')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Already have an account? <span style={{ color: 'var(--yellow)' }}>Sign in</span>
                </button>
              </>
            )}

            {/* ── FORGOT PASSWORD MODE ──────────────────────── */}
            {mode === 'forgot' && (
              <>
                <div>
                  <div className="login-h">Reset <span>Password.</span></div>
                  <div className="login-sub" style={{ marginTop: '0.5rem' }}>
                    {forgotStep === 'email' ? 'Enter your email to get a code' : 'Enter code and new password'}
                  </div>
                </div>

                {error && <div className="notice notice-r">{error}</div>}
                {success && <div className="notice notice-g">{success}</div>}

                {forgotStep === 'email' && (
                  <>
                    <div className="inp-wrap" data-label="Email">
                      <input
                        className="inp"
                        id="forgot-email"
                        type="email"
                        placeholder="bhadu@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendForgotOtp()}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={sendForgotOtp}
                      disabled={loading || !email.trim()}
                    >
                      {loading ? <span className="spinner" /> : 'Send Reset Code'}
                    </button>
                  </>
                )}

                {forgotStep === 'otp' && (
                  <>
                    <div className="inp-wrap" data-label="6-Digit Code">
                      <input
                        className="inp"
                        id="forgot-otp"
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                    <div className="inp-wrap" data-label="New Password">
                      <input
                        className="inp"
                        id="forgot-newpw"
                        type="password"
                        placeholder="Minimum 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && resetPassword()}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-lg btn-block"
                      onClick={resetPassword}
                      disabled={loading || otp.length < 6 || newPassword.length < 8}
                    >
                      {loading ? <span className="spinner" /> : 'Reset Password'}
                    </button>
                  </>
                )}

                <button
                  className="login-foot"
                  onClick={() => switchMode('signin')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Back to <span style={{ color: 'var(--yellow)' }}>sign in</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
