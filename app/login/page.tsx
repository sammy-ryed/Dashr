'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import MarqueeBar from '@/components/MarqueeBar';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function sendOTP() {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ 
      email, 
      options: { 
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`
      } 
    });
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
      setSuccess(`OTP sent to ${email}`);
    }
    setLoading(false);
  }

  async function verifyOTP() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user) {
      // Check if profile exists
      const { data: profile } = await supabase.from('users').select('role, name').eq('id', data.user.id).single();
      if (!profile || !profile.name) {
        router.push('/onboarding');
      } else if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'agent') {
        router.push('/agent/dashboard');
      } else {
        router.push('/order');
      }
    }
    setLoading(false);
  }

  return (
    <>
      <MarqueeBar />
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="login-wrap" style={{ width: '100%', maxWidth: '64rem' }}>
          <div className="login-l">
            <div className="login-brand">DASHR.</div>
            <div className="login-tagline">
              Built by SRM students.<br />
              Run by SRM students.<br />
              For SRM students.
            </div>
          </div>
          <div className="login-r">
            <div className="login-form">
              <div>
                <div className="login-h">Sign <span>In.</span></div>
                <div className="login-sub" style={{ marginTop: '0.5rem' }}>
                  {step === 'email' ? 'Email OTP · SRM verified' : 'Check your inbox'}
                </div>
              </div>

              {error && <div className="notice notice-r">{error}</div>}
              {success && <div className="notice notice-g">{success}</div>}

              {step === 'email' ? (
                <>
                  <div className="inp-wrap" data-label="SRM Email">
                    <input
                      className="inp"
                      type="email"
                      placeholder="yourname@srmist.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-lg btn-block"
                    onClick={sendOTP}
                    disabled={loading || !email}
                  >
                    {loading ? <span className="spinner" /> : 'Send OTP →'}
                  </button>
                </>
              ) : (
                <>
                  <div className="inp-wrap" data-label="6-Digit OTP">
                    <input
                      className="inp"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && verifyOTP()}
                    />
                    <button className="inp-btn" onClick={() => { setStep('email'); setSuccess(''); }}>↩</button>
                  </div>
                  <button
                    className="btn btn-primary btn-lg btn-block"
                    onClick={verifyOTP}
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? <span className="spinner" /> : 'Verify & Enter →'}
                  </button>
                </>
              )}

              <div className="login-foot">
                Want to deliver? <Link href="/onboarding?role=agent">Register as Dasher →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
