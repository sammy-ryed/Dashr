'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import { AGENT_FLOAT_THRESHOLD, ABODE_BLOCKS } from '@/lib/config';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';
import TipsOverlay from '@/components/TipsOverlay';
import { useCollege } from '@/lib/college-context';


export default function OrderPage() {
  const router = useRouter();
  const supabase = createClient();
  const { college } = useCollege();

  // Derived hostel lists from college config
  const allHostels = college.hostels;
  const hasCategories = allHostels.some(h => !!h.category);
  const availableCategories = hasCategories
    ? [...new Set(allHostels.map(h => h.category).filter((c): c is string => !!c))]
    : [];
  const hasSrmAbode = college.slug === 'srm';

  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [showTips, setShowTips] = useState(false);


  const [itemDescription, setItemDescription] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState('');
  const [pickupDetails, setPickupDetails] = useState('');
  const [locationType, setLocationType] = useState<'hostel' | 'abode' | 'other' | ''>('');
  const [hostelCategory, setHostelCategory] = useState<string>('');
  const [hostel, setHostel] = useState('');
  const [block, setBlock] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [room, setRoom] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [commission, setCommission] = useState<string>(String(college.commissionTiers.inside));
  const [commError, setCommError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeHotspot = college.hotspots.find(h => h.id === selectedHotspot);
  const isOutsideCampus = activeHotspot?.location === 'outside';
  const minComm = isOutsideCampus ? college.commissionTiers.outside : college.commissionTiers.inside;
  const isAgentFloat = !orderValue || Number(orderValue) < AGENT_FLOAT_THRESHOLD;

  const insideHotspots = college.hotspots.filter(h => h.location === 'inside');
  const outsideHotspots = college.hotspots.filter(h => h.location === 'outside');

  useEffect(() => {
    async function init() {
      const authUser = await getUserSafe(supabase);
      if (authUser) {
        const { data: profile } = await supabase.from('users').select('name, role, is_banned, has_seen_tips').eq('id', authUser.id).single();
        const p = profile as { name: string; role: string; is_banned: boolean; has_seen_tips: boolean } | null;
        if (p) {
          if (p.is_banned) { router.push('/banned'); return; }
          setUser({ id: authUser.id, name: p.name || '', role: p.role });
          if (!p.has_seen_tips) setShowTips(true);
        }
      }
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'agent').eq('is_online', true);
      setOnlineCount(count || 0);
      setAuthLoading(false);
    }
    init();

    // Subscribe to online status changes
    const channel = supabase
      .channel('agent-online-status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: 'role=eq.agent',
      }, async () => {
        const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'agent').eq('is_online', true);
        setOnlineCount(count || 0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleHotspotSelect(hotspotId: string) {
    setSelectedHotspot(hotspotId);
    const spot = college.hotspots.find(h => h.id === hotspotId);
    if (spot) {
      const floor = college.commissionTiers[spot.location];
      const numComm = Number(commission) || 0;
      if (numComm < floor) {
        setCommission(String(floor));
        setCommError('');
      }
    }
  }

  function handleCommissionBlur() {
    const num = Number(commission) || 0;
    if (num < minComm) {
      setCommission(String(minComm));
      setCommError(`Minimum is ₹${minComm} for ${isOutsideCampus ? 'outside campus' : 'inside campus'}`);
      setTimeout(() => setCommError(''), 3000);
    } else {
      setCommError('');
    }
  }

  function adjustCommission(delta: number) {
    const current = Number(commission) || minComm;
    const next = Math.max(minComm, current + delta);
    setCommission(String(next));
    setCommError('');
  }

  async function placeOrder() {
    if (!itemDescription.trim()) { setError('Describe what you want'); return; }
    if (!selectedHotspot || !activeHotspot) { setError('Select where to pick up from'); return; }
    
    // Validate location selection
    let finalLocation = '';
    if (locationType === 'abode') {
      if (!block) { setError('Select your Abode block'); return; }
      finalLocation = `Abode - Block ${block}`;
    } else if (locationType === 'hostel') {
      if (hasCategories && !hostelCategory) { setError('Select hostel category'); return; }
      if (!hostel) { setError('Select your hostel'); return; }
      finalLocation = hostel;
    } else if (locationType === 'other') {
      if (!customLocation.trim()) { setError('Enter your location'); return; }
      finalLocation = customLocation.trim();
    } else {
      setError('Select where to deliver');
      return;
    }
    
    if (!room.trim()) { setError('Enter your room number'); return; }
    if (!orderValue || Number(orderValue) <= 0) { setError('Enter order value'); return; }
    const commNum = Number(commission) || 0;
    if (commNum < minComm) { setError(`Minimum commission for ${isOutsideCampus ? 'outside campus' : 'inside campus'} is ₹${minComm}`); return; }


    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemDescription: itemDescription.trim(),
          pickupLocation: pickupDetails ? `${activeHotspot!.name} — ${pickupDetails}` : activeHotspot!.name,
          pickupZone: isOutsideCampus ? 'off_campus' : 'on_campus',
          deliveryHostel: finalLocation,
          deliveryRoom: room.trim(),
          orderValue: Number(orderValue),
          commissionAmount: Number(commission),
          minCommission: minComm,
          paymentMethod: isAgentFloat ? 'agent_float' : 'upi_on_delivery',
        }),
      });

      const data = await res.json();
      if (!data.ok || !data.orderId) {
        setError(data.error || 'Failed to place order');
        setLoading(false);
        return;
      }

      router.push(`/order/${data.orderId}/status`);
    } catch {
      setError('Network error.');
      setLoading(false);
    }
  }

  return (
    <>
      {showTips && user && <TipsOverlay userId={user.id} role="customer" />}
      <Nav role={user?.role === 'admin' ? 'admin' : 'customer'} actualRole={user?.role} userName={user?.name} isLoading={authLoading} />
      <MarqueeBar />


      <div className="page-enter" style={{ minHeight: '85vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem clamp(1rem,5vw,4rem)' }}>
        <div className="page-mock" style={{ width: '100%', maxWidth: '36rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="sec-label" style={{ marginBottom: 0 }}>New Order</div>
            <span className={`badge ${onlineCount > 0 ? 'badge-g' : 'badge-r'}`}>
              {onlineCount > 0 ? `${onlineCount} Online` : 'No Dashers'}
            </span>
          </div>

          <div className="mock-title">Place an<br /><span>Order.</span></div>

          {error && <div className="notice notice-r" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Item */}
            <div className="inp-wrap" data-label="What do you need?">
              <textarea
                className="inp"
                id="order-item"
                placeholder="2x Maggi, 1 Red Bull from A-Block canteen..."
                rows={2}
                style={{ resize: 'none' }}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
            </div>

            {/* Pickup — hotspot chip selector */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.6rem' }}>Pickup from</div>

              {insideHotspots.length > 0 && (
                <>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>Inside campus</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
                    {insideHotspots.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleHotspotSelect(h.id)}
                        style={{
                          fontFamily: 'var(--mono)', fontSize: '0.68rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '0.5em 1em', border: '0.14rem solid',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          borderColor: selectedHotspot === h.id ? 'var(--ink)' : '#444',
                          background: selectedHotspot === h.id ? 'var(--yellow)' : 'var(--surf2)',
                          color: selectedHotspot === h.id ? 'var(--ink)' : 'var(--muted)',
                          boxShadow: selectedHotspot === h.id ? '0.2rem 0.2rem 0 var(--ink)' : '0.15rem 0.15rem 0 #333',
                        }}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {outsideHotspots.length > 0 && (
                <>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' }}>Outside campus gate · ₹{college.commissionTiers.outside} min</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {outsideHotspots.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => handleHotspotSelect(h.id)}
                        style={{
                          fontFamily: 'var(--mono)', fontSize: '0.68rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '0.5em 1em', border: '0.14rem solid',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          borderColor: selectedHotspot === h.id ? 'var(--danger)' : '#444',
                          background: selectedHotspot === h.id ? 'var(--danger)' : 'var(--surf2)',
                          color: selectedHotspot === h.id ? '#fff' : 'var(--muted)',
                          boxShadow: selectedHotspot === h.id ? '0.2rem 0.2rem 0 var(--danger)' : '0.15rem 0.15rem 0 #333',
                        }}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Extra details field — stall number, item context, etc. */}
              {activeHotspot && (
                <div className="inp-wrap" data-label="Stall / Extra Details (optional)" style={{ marginTop: '0.8rem' }}>
                  <input
                    className="inp"
                    id="order-pickup-detail"
                    type="text"
                    placeholder={`e.g. stall 3, counter near entrance...`}
                    value={pickupDetails}
                    onChange={(e) => setPickupDetails(e.target.value)}
                  />
                </div>
              )}

              {/* Outside campus warning */}
              {isOutsideCampus && (
                <div className="notice notice-y" style={{ marginTop: '0.6rem' }}>
                  Outside campus pickup — min commission ₹{college.commissionTiers.outside}. Dasher walks ~{activeHotspot?.walkMinutesFromFar} min.
                </div>
              )}
            </div>

            {/* Delivery Location tabs */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.6rem' }}>Delivery Location</div>
              <div className="zone-grid">
                <button
                  type="button"
                  className={`zone-btn ${locationType === 'hostel' ? 'active' : ''}`}
                  onClick={() => {
                    setLocationType('hostel');
                    setHostelCategory('');
                    setHostel('');
                    setBlock('');
                    setCustomLocation('');
                  }}
                >
                  Hostel
                </button>
                {hasSrmAbode && (
                  <button
                    type="button"
                    className={`zone-btn ${locationType === 'abode' ? 'active' : ''}`}
                    onClick={() => {
                      setLocationType('abode');
                      setHostelCategory('');
                      setHostel('');
                      setBlock('');
                      setCustomLocation('');
                    }}
                  >
                    Abode
                  </button>
                )}
                <button
                  type="button"
                  className={`zone-btn ${locationType === 'other' ? 'active' : ''}`}
                  onClick={() => {
                    setLocationType('other');
                    setHostelCategory('');
                    setHostel('');
                    setBlock('');
                    setCustomLocation('');
                  }}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Hostel Section */}
            {locationType === 'hostel' && (
              <>
                {/* Category tabs — shown for colleges that use them (e.g. SRM: boys/girls/international) */}
                {hasCategories && (
                  <div>
                    <div className="type-label" style={{ marginBottom: '0.6rem' }}>Hostel Category</div>
                    <div className="zone-grid">
                      {availableCategories.map((cat) => (
                        <button
                          key={cat}
                          className={`zone-btn ${hostelCategory === cat ? 'active' : ''}`}
                          onClick={() => { setHostelCategory(cat); setHostel(''); }}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hostel picker — always show for flat-list colleges, show after category pick for categorised ones */}
                {(hasCategories ? !!hostelCategory : true) && (
                  <div className="inp-wrap" data-label="Hostel">
                    <select className="inp" id="order-hostel" value={hostel} onChange={(e) => setHostel(e.target.value)}>
                      <option value="">Select...</option>
                      {(hasCategories
                        ? allHostels.filter(h => h.category === hostelCategory)
                        : allHostels
                      ).map((h) => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Abode Section */}
            {locationType === 'abode' && (
              <div className="inp-wrap" data-label="Block">
                <select className="inp" id="order-abode-block" value={block} onChange={(e) => setBlock(e.target.value)}>
                  <option value="">Select...</option>
                  {ABODE_BLOCKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Other Section */}
            {locationType === 'other' && (
              <div className="inp-wrap" data-label="Location Details">
                <input
                  className="inp"
                  id="order-custom-location"
                  type="text"
                  placeholder="e.g., 3rd Cross Road, Near Cafeteria..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                />
              </div>
            )}

            {/* Room */}
            <div className="inp-wrap" data-label="Room No.">
              <input className="inp" id="order-room" type="text" placeholder="204" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>

            {/* Value */}
            <div className="inp-wrap" data-label="Order Value (INR)">
              <input className="inp" id="order-value" type="number" placeholder="0" min="1" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '0.6rem', whiteSpace: 'nowrap', letterSpacing: '0.04em',
                color: isAgentFloat ? 'var(--green)' : 'var(--orange)',
                textTransform: 'uppercase',
              }}>
                {isAgentFloat ? `₹${orderValue || 0} · Dasher Prepaid` : `₹${orderValue || 0} · Pay on delivery`}
              </span>
            </div>

            {/* Commission */}
            <div className="comm-wrap">
              <div className="comm-row">
                <span className="comm-prefix">₹</span>
                <button type="button" className="comm-step" onClick={() => adjustCommission(-5)} aria-label="Decrease">−</button>
                <input
                  className="comm-num"
                  id="order-commission"
                  type="number"
                  inputMode="numeric"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  onBlur={handleCommissionBlur}
                />
                <button type="button" className="comm-step" onClick={() => adjustCommission(5)} aria-label="Increase">+</button>
              </div>
              {commError && <div className="comm-err">{commError}</div>}
              <div className="comm-hint">MIN ₹{minComm} for {isOutsideCampus ? 'outside campus' : 'inside campus'} · Higher = faster pickup</div>
            </div>

            <div className="phone-notice">
              <div className="phone-notice-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
              </div>
              <div>
                <strong>Direct coordination</strong> — Your phone number will be shared with your dasher so they
                can reach you during delivery. Keeps things fast and personal, no middleman.
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" id="order-submit" onClick={placeOrder} disabled={loading || !user}>
              {loading ? <span className="spinner" /> : 'Post Order'}
            </button>

            {!user && (
              <div className="login-foot"><a href="/login">Login to place an order</a></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
