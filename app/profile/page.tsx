'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import Nav from '@/components/Nav';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; phone: string; role: string; strikes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await getUserSafe(supabase);
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setProfile({ ...data, email: user.email || '' });
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function handleLogout() {
    setLoggingOut(true);
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '0.14rem solid #333', paddingBottom: '1.5rem' }}>
            <div className="nav-user-avatar" style={{ width: '4rem', height: '4rem', fontSize: '1.5rem' }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="type-h2" style={{ color: 'var(--white)', letterSpacing: '0.02em', textTransform: 'none' }}>{profile.name}</div>
              <div className="type-label" style={{ marginTop: '0.3rem' }}>{profile.role.toUpperCase()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="type-label" style={{ marginBottom: '0.2rem' }}>Email</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>{profile.email}</div>
            </div>
            
            <div>
              <div className="type-label" style={{ marginBottom: '0.2rem' }}>Phone Number</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>+91 {profile.phone}</div>
            </div>

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
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '0.14rem solid #333' }}>
            <button className="btn btn-danger btn-block" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? <span className="spinner" /> : 'Sign Out'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
