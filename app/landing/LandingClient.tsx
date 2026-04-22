'use client';

import Link from 'next/link';
import { useState } from 'react';
import HamburgerThemePanel from '@/components/HamburgerThemePanel';

const HOW_CUSTOMER = [
  { n: '01', title: 'DROP YOUR ORDER', body: 'Tell us what you want and where to pick it up. Maggi? Red Bull? That one printer at A-block? We don\'t judge.' },
  { n: '02', title: 'SET YOUR TIP', body: 'Higher tip = faster pickup. Economics 101. Your dasher sees it and decides if it\'s worth leaving their cozy room.' },
  { n: '03', title: 'CHILL OUT', body: 'Watch the status update in real time. Your order goes from "Pending" to "At Your Door" while you\'re still in your pajamas.' },
];

const HOW_DASHER = [
  { n: '01', title: 'GO ONLINE', body: 'Flip the switch. Suddenly you\'re a business person. Orders flood in. Feel the power.' },
  { n: '02', title: 'PICK A JOB', body: 'Browse open orders sorted by commission. Accept only the ones that make financial sense. You\'re an entrepreneur now.' },
  { n: '03', title: 'GET PAID', body: 'Deliver, collect your cash or commission. Watch your ledger go up. Tell your parents you\'re "in logistics."' },
];

const ROASTS = [
  '🧍 Walking to the canteen is cardio you didn\'t ask for.',
  '💀 Your hostel is 3 buildings away from food. That\'s basically off-campus.',
  '🥵 It\'s 40°C outside. You have an exam in 2 hours. You deserve this.',
  '😴 You\'ve been lying down for 4 hours. Getting up is not an option.',
  '📚 You\'re "studying" — ordering Maggi is self-care.',
];

const FAQS = [
  { q: 'Is this legit?', a: 'Extremely. Every dasher is a verified SRM student with an ID card on file. No randos, no scams. Just broke students helping slightly-broker students.' },
  { q: 'What can I order?', a: 'Anything on or near campus. Food, stationery, medicines, forgotten chargers — if it exists near SRM, DASHR will fetch it.' },
  { q: 'How do dashers get paid?', a: 'You set the commission when you place the order. Dashers see it upfront and choose whether to accept. Transparent, no hidden cuts.' },
  { q: 'What if my dasher ghosts me?', a: 'They won\'t. They have to face you on campus. But seriously — ratings, strikes, and bans. We keep dashers accountable.' },
  { q: 'Can I be both a customer AND a dasher?', a: 'Yes! Dashers can switch to Customer Mode and order stuff too. Many dashers order between deliveries. Full circle.' },
];

export default function LandingClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--header-bg)',
        borderBottom: '0.14rem solid var(--yellow)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(0.9rem,3vw,1.3rem) clamp(1rem,5vw,4rem)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="nav-logo">DASHR<sup>SRM</sup></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Link href="/login" className="btn btn-ghost btn-sm" style={{ display: 'none' }} id="nav-login-desktop">Sign In</Link>
          <Link href="/login" className="btn btn-primary btn-sm">Get Started</Link>
          {/* Hamburger for theme panel */}
          <button
            className="hamburger hamburger-visible"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            style={{ display: 'flex' }}
          >
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Slide-out theme menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.4rem', borderBottom: '0.14rem solid #2a2a2a' }}>
              <div className="nav-logo" style={{ padding: 0, fontSize: '1.4rem' }}>DASHR<sup>SRM</sup></div>
              <div className="type-label" style={{ marginTop: '0.4rem', fontSize: '0.55rem' }}>Customize your vibe</div>
            </div>
            <div style={{ flex: 1, padding: '0.8rem 0' }}>
              <HamburgerThemePanel />
            </div>
            <div style={{ padding: '1.2rem 1.4rem', borderTop: '0.14rem solid #2a2a2a', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Link href="/login" className="btn btn-primary btn-block btn-sm" onClick={() => setMenuOpen(false)}>Get Started</Link>
              <Link href="/login" className="btn btn-ghost btn-block btn-sm" onClick={() => setMenuOpen(false)}>Sign In</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem)', position: 'relative', overflow: 'hidden' }}>
        {/* Background watermark */}
        <div aria-hidden style={{
          position: 'absolute', bottom: '-3rem', right: '-2rem',
          fontFamily: 'var(--font)', fontSize: 'clamp(10rem,30vw,22rem)',
          fontWeight: 900, color: 'rgba(233,181,11,0.04)',
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          letterSpacing: '-0.04em',
        }}>DASHR</div>

        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,28rem),1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div className="sec-label" style={{ marginBottom: '1.5rem' }}>Campus Delivery · SRM IST</div>
            <h1 className="type-hero" style={{ marginBottom: '1.5rem', lineHeight: 0.88 }}>
              TOO LAZY<br />TO WALK?<br /><span>SAME.</span>
            </h1>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 'clamp(0.75rem,2vw,0.9rem)', color: '#aaa', lineHeight: 1.8, maxWidth: '28rem', marginBottom: '2rem' }}>
              DASHR connects SRM students who want stuff delivered with students who need money.
              It&apos;s capitalism, but make it <strong style={{ color: 'var(--yellow)' }}>cute</strong>.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/login" className="btn btn-primary btn-lg">Order Now →</Link>
              <Link href="/login?role=agent" className="btn btn-ghost btn-lg">Become a Dasher</Link>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[['500+', 'Orders delivered'], ['₹0', 'Hidden fees'], ['24/7', 'Student-powered']].map(([val, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--yellow)' }}>{val}</div>
                  <div className="type-label" style={{ fontSize: '0.55rem' }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side card */}
          <div>
            <div style={{ background: 'var(--surf)', border: '0.22rem solid var(--yellow)', boxShadow: '0.8rem 0.8rem 0 var(--yellow)', padding: '2rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-0.8rem', left: '1rem', background: 'var(--yellow)', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0.1em 0.6em', border: '0.14rem solid var(--ink)' }}>
                Live Order Feed
              </div>
              {[
                { id: 'A4F2', item: '2x Maggi + 1 Red Bull from Nilgiri', to: 'Sannasi A · Room 204', comm: '₹35', status: 'pending' },
                { id: 'C91B', item: 'Charger from B-block stationery', to: 'ESQ A · Room 108', comm: '₹40', status: 'assigned' },
                { id: '7E3D', item: 'Printer + 5 pages from CSE dept', to: 'Paari Hostel · Room 312', comm: '₹55', status: 'picked_up' },
              ].map((o) => (
                <div key={o.id} style={{ background: 'var(--surf2)', border: '0.14rem solid #333', padding: '0.8rem', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--yellow)' }}>ORDER_{o.id}</span>
                    <span className={`badge ${o.status === 'pending' ? 'badge-y' : o.status === 'assigned' ? 'badge-b' : 'badge-o'}`}>{o.status.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: '0.75rem', color: 'var(--white)', marginBottom: '0.2rem' }}>{o.item}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: 'var(--muted)' }}>{o.to}</div>
                  <div style={{ marginTop: '0.4rem', fontFamily: 'var(--mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--yellow)' }}>{o.comm} commission</div>
                </div>
              ))}
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: 'var(--muted)', textAlign: 'center', marginTop: '0.4rem', letterSpacing: '0.1em' }}>UPDATES IN REAL TIME · FICTIONAL DEMO</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROAST TICKER ── */}
      <div className="marquee-bar" style={{ borderTop: '0.14rem solid var(--ink)' }}>
        <div className="marquee-track">
          {[...ROASTS, ...ROASTS].map((r, i) => (
            <span key={i} className="marquee-item">{r}<span className="marquee-sep">◆</span></span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS: CUSTOMER ── */}
      <section style={{ padding: 'clamp(3rem,8vw,5rem) clamp(1rem,5vw,4rem)', borderBottom: '0.12rem solid #1a1a1a' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div className="sec-label">For Customers</div>
          <h2 className="type-h1" style={{ marginBottom: '2.5rem' }}>Order in <span style={{ color: 'var(--yellow)' }}>3 Steps.</span></h2>
          <div className="grid-3">
            {HOW_CUSTOMER.map((s) => (
              <div key={s.n} style={{ background: 'var(--surf)', border: '0.18rem solid var(--white)', boxShadow: 'var(--sh-w)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: '4rem', fontWeight: 900, color: 'rgba(233,181,11,0.08)', position: 'absolute', top: '-0.5rem', right: '0.5rem', lineHeight: 1 }}>{s.n}</div>
                <div className="type-label" style={{ color: 'var(--yellow)', marginBottom: '0.8rem' }}>{s.n}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 900, color: 'var(--white)', marginBottom: '0.7rem', textTransform: 'uppercase' }}>{s.title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#aaa', lineHeight: 1.7 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: DASHER ── */}
      <section style={{ padding: 'clamp(3rem,8vw,5rem) clamp(1rem,5vw,4rem)', background: 'var(--surf)', borderBottom: '0.12rem solid #2a2a2a', borderTop: '0.14rem solid var(--yellow)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <div className="sec-label">For Dashers</div>
          <h2 className="type-h1" style={{ marginBottom: '2.5rem' }}>Earn While You <span style={{ color: 'var(--yellow)' }}>Exist.</span></h2>
          <div className="grid-3">
            {HOW_DASHER.map((s) => (
              <div key={s.n} style={{ background: 'var(--bg)', border: '0.18rem solid var(--yellow)', boxShadow: 'var(--sh-y)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: '4rem', fontWeight: 900, color: 'rgba(233,181,11,0.06)', position: 'absolute', top: '-0.5rem', right: '0.5rem', lineHeight: 1 }}>{s.n}</div>
                <div className="type-label" style={{ color: 'var(--yellow)', marginBottom: '0.8rem' }}>{s.n}</div>
                <div style={{ fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 900, color: 'var(--white)', marginBottom: '0.7rem', textTransform: 'uppercase' }}>{s.title}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#aaa', lineHeight: 1.7 }}>{s.body}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/login?role=agent" className="btn btn-primary btn-lg">Apply to Dash →</Link>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ✓ SRM ID required · ✓ Admin verified · ✓ Your call on every order
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: 'clamp(3rem,8vw,5rem) clamp(1rem,5vw,4rem)', borderBottom: '0.12rem solid #1a1a1a' }}>
        <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
          <div className="sec-label">Real Questions, Actual Answers</div>
          <h2 className="type-h1" style={{ marginBottom: '2rem' }}>FAQ <span style={{ color: 'var(--yellow)' }}>(No Cap.)</span></h2>
          {FAQS.map((f, i) => (
            <div
              key={i}
              style={{
                borderBottom: '0.12rem solid #222',
                cursor: 'pointer',
              }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 0', gap: '1rem' }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 'clamp(0.85rem,2vw,1rem)', fontWeight: 900, textTransform: 'uppercase', color: 'var(--white)' }}>{f.q}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '1.2rem', color: 'var(--yellow)', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</div>
              </div>
              {openFaq === i && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: '#bbb', lineHeight: 1.8, paddingBottom: '1.2rem', animation: 'fadeInUp 0.25s ease' }}>
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: 'clamp(4rem,10vw,7rem) clamp(1rem,5vw,4rem)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(233,181,11,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="sec-label" style={{ justifyContent: 'center', display: 'flex' }}>SRM IST · Kattankulathur</div>
        <h2 className="type-hero" style={{ margin: '1rem 0', maxWidth: '100%' }}>
          YOUR FOOD<br />IS <span>ONE TAP</span><br />AWAY.
        </h2>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 'clamp(0.7rem,2vw,0.85rem)', color: 'var(--muted)', marginBottom: '2.5rem', maxWidth: '28rem', margin: '1rem auto 2.5rem' }}>
          Join hundreds of SRM students who figured out that walking is optional.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn-primary btn-lg">Order Now →</Link>
          <Link href="/login?role=agent" className="btn btn-ghost btn-lg">Earn as Dasher</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '0.14rem solid #222', padding: '2rem clamp(1rem,5vw,4rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="nav-logo" style={{ fontSize: '1.2rem' }}>DASHR<sup>SRM</sup></div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Refund Policy', '/refund-policy'], ['Sign In', '/login']].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontFamily: 'var(--mono)', fontSize: '0.58rem', color: '#555', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em', transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--yellow)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
            >{label}</Link>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.55rem', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Built by SRM students, for SRM students.
        </div>
      </footer>
    </div>
  );
}
