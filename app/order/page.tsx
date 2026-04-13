'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { COMMISSION_FLOORS, AGENT_FLOAT_THRESHOLD, ZONE_LABELS, SRM_HOSTELS_NEW, ABODE_BLOCKS } from '@/lib/config';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';
import type { Zone } from '@/lib/config';

export default function OrderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);

  const [itemDescription, setItemDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [zone, setZone] = useState<Zone>('on_campus');
  const [locationType, setLocationType] = useState<'hostel' | 'abode' | 'other' | ''>('');
  const [hostelCategory, setHostelCategory] = useState<'boys' | 'girls' | 'international' | ''>('');
  const [hostel, setHostel] = useState('');
  const [block, setBlock] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [room, setRoom] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [commission, setCommission] = useState<string>(String(COMMISSION_FLOORS.on_campus));
  const [commError, setCommError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minComm = COMMISSION_FLOORS[zone];
  const isAgentFloat = !orderValue || Number(orderValue) < AGENT_FLOAT_THRESHOLD;

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('users').select('name, role').eq('id', authUser.id).single();
        const p = profile as { name: string; role: string } | null;
        if (p) setUser({ id: authUser.id, name: p.name || '', role: p.role });
      }
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'agent').eq('is_online', true);
      setOnlineCount(count || 0);
      setAuthLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleZone(z: Zone) {
    setZone(z);
    const floor = COMMISSION_FLOORS[z];
    const numComm = Number(commission) || 0;
    if (numComm < floor) {
      setCommission(String(floor));
      setCommError('');
    }
  }

  function handleCommissionBlur() {
    const num = Number(commission) || 0;
    if (num < minComm) {
      setCommission(String(minComm));
      setCommError(`Minimum is ₹${minComm} for ${ZONE_LABELS[zone]}`);
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
    if (!pickupLocation.trim()) { setError('Enter pickup location'); return; }
    
    // Validate location selection
    let finalLocation = '';
    if (locationType === 'abode') {
      if (!block) { setError('Select your Abode block'); return; }
      finalLocation = `Abode - Block ${block}`;
    } else if (locationType === 'hostel') {
      if (!hostelCategory) { setError('Select hostel category'); return; }
      if (!hostel) { setError('Select your hostel'); return; }
      finalLocation = hostel;
    } else if (locationType === 'other') {
      if (!customLocation.trim()) { setError('Enter your location'); return; }
      finalLocation = customLocation.trim();
    } else {
      setError('Select a location type');
      return;
    }
    
    if (!room.trim()) { setError('Enter your room number'); return; }
    if (!orderValue || Number(orderValue) <= 0) { setError('Enter order value'); return; }
    const commNum = Number(commission) || 0;
    if (commNum < minComm) { setError(`Minimum commission for ${ZONE_LABELS[zone]} is ₹${minComm}`); return; }


    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemDescription: itemDescription.trim(),
          pickupLocation: pickupLocation.trim(),
          pickupZone: zone,
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

            {/* Zone */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.6rem' }}>Pickup Zone</div>
              <div className="zone-grid">
                {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                  <button key={z} className={`zone-btn ${zone === z ? 'active' : ''}`} onClick={() => handleZone(z)}>
                    {ZONE_LABELS[z]}
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup */}
            <div className="inp-wrap" data-label="Pickup Location">
              <input className="inp" id="order-pickup" type="text" placeholder="Nilgiri canteen, stall 3..." value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
            </div>

            {/* Location Type Selection */}
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
                {/* Hostel Category */}
                <div>
                  <div className="type-label" style={{ marginBottom: '0.6rem' }}>Hostel Category</div>
                  <div className="zone-grid">
                    {(['boys', 'girls', 'international'] as const).map((cat) => (
                      <button
                        key={cat}
                        className={`zone-btn ${hostelCategory === cat ? 'active' : ''}`}
                        onClick={() => {
                          setHostelCategory(cat);
                          setHostel('');
                        }}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hostel Selection */}
                {hostelCategory && (
                  <div className="inp-wrap" data-label="Hostel">
                    <select className="inp" id="order-hostel" value={hostel} onChange={(e) => setHostel(e.target.value)}>
                      <option value="">Select...</option>
                      {SRM_HOSTELS_NEW[hostelCategory].map((h) => (
                        <option key={h} value={h}>{h}</option>
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
              <div className="comm-hint">MIN ₹{minComm} for {ZONE_LABELS[zone]} · Higher = faster pickup</div>
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
