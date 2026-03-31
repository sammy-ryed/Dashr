'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { COMMISSION_FLOORS, AGENT_FLOAT_THRESHOLD, ZONE_LABELS } from '@/lib/constants';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';
import type { Zone } from '@/lib/constants';

const SRM_HOSTELS = [
  'Himalaya Block', 'Kaveri Block', 'Ganga Block', 'Yamuna Block',
  'Godavari Block', 'Sindhu Block', 'Krishna Block', 'Tungabhadra Block',
  'Narmada Block', 'Brahmaputra Block', 'Mahanadi Block', 'Alaknanda Block',
];

export default function OrderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  const [itemDescription, setItemDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [zone, setZone] = useState<Zone>('on_campus');
  const [hostel, setHostel] = useState('');
  const [room, setRoom] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [commission, setCommission] = useState<number>(COMMISSION_FLOORS.on_campus);

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
    }
    init();
  }, []);

  function handleZone(z: Zone) {
    setZone(z);
    const floor = COMMISSION_FLOORS[z];
    if (commission < floor) setCommission(floor);
  }

  async function placeOrder() {
    if (!itemDescription.trim()) { setError('Describe what you want'); return; }
    if (!pickupLocation.trim()) { setError('Enter pickup location'); return; }
    if (!hostel) { setError('Select your hostel'); return; }
    if (!room.trim()) { setError('Enter your room number'); return; }
    if (!orderValue || Number(orderValue) <= 0) { setError('Enter order value'); return; }
    if (commission < minComm) { setError(`Minimum commission for ${ZONE_LABELS[zone]} is ₹${minComm}`); return; }

    setLoading(true);
    setError('');

    const payload = {
      customer_id: user!.id,
      item_description: itemDescription.trim(),
      pickup_location: pickupLocation.trim(),
      pickup_zone: zone,
      delivery_hostel: hostel,
      delivery_room: room.trim(),
      order_value: Number(orderValue),
      commission_amount: commission,
      min_commission: minComm,
      payment_method: isAgentFloat ? 'agent_float' : 'upi_on_delivery',
      status: 'pending',
    };

    const { data, error: insertError } = await supabase.from('orders').insert(payload).select('id').single();
    if (insertError) { setError(insertError.message); setLoading(false); return; }

    router.push(`/order/${data.id}/status`);
  }

  return (
    <>
      <Nav role={user?.role as 'customer'} userName={user?.name} />
      <MarqueeBar />

      <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '3rem clamp(1rem,5vw,4rem)' }}>
        <div className="page-mock" style={{ width: '100%', maxWidth: '36rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
            <div className="nav-logo" style={{ fontSize: '1.4rem', padding: 0 }}>DASHR<sup style={{ fontFamily: 'var(--mono)', fontSize: '0.5rem', background: 'var(--yellow)', color: 'var(--ink)', padding: '0.1em 0.4em', border: '0.12rem solid var(--ink)', verticalAlign: 'super', marginLeft: '0.2rem' }}>SRM</sup></div>
            <span className={`badge ${onlineCount > 0 ? 'badge-gf' : 'badge-r'}`}>
              {onlineCount > 0 ? `● ${onlineCount} Dashers Online` : '⊘ No Dashers Online'}
            </span>
          </div>

          <div className="mock-title">Place an<br /><span>Order.</span></div>

          {error && <div className="notice notice-r" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Item description */}
            <div className="inp-wrap" data-label="What do you want?">
              <textarea
                className="inp"
                placeholder="2x Maggi, 1 Red Bull from A-Block canteen..."
                rows={2}
                style={{ resize: 'none' }}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />
            </div>

            {/* Zone selector */}
            <div>
              <div className="type-label" style={{ marginBottom: '0.7rem' }}>Pickup Zone</div>
              <div className="zone-grid">
                {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                  <button
                    key={z}
                    className={`zone-btn ${zone === z ? 'active' : ''}`}
                    onClick={() => handleZone(z)}
                  >
                    {ZONE_LABELS[z]}
                  </button>
                ))}
              </div>
            </div>

            {/* Pickup location */}
            <div className="inp-wrap" data-label="Pickup Location">
              <input
                className="inp"
                type="text"
                placeholder="Nilgiri canteen, stall 3..."
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
            </div>

            {/* Hostel + Room */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem' }}>
              <div className="inp-wrap" data-label="Your Hostel Block">
                <select className="inp" value={hostel} onChange={(e) => setHostel(e.target.value)}>
                  <option value="">Select...</option>
                  {SRM_HOSTELS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="inp-wrap" data-label="Room No.">
                <input className="inp" type="text" placeholder="204" value={room} onChange={(e) => setRoom(e.target.value)} />
              </div>
            </div>

            {/* Order value */}
            <div className="inp-wrap" data-label="Order Value (₹)">
              <input
                className="inp"
                type="number"
                placeholder="0"
                min="1"
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
              />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '0.62rem', whiteSpace: 'nowrap', letterSpacing: '0.04em',
                color: isAgentFloat ? 'var(--green)' : 'var(--orange)',
              }}>
                {isAgentFloat ? 'Agent float' : 'UPI on delivery'}
              </span>
            </div>

            {/* Payment method explanation */}
            <div className="notice notice-y" style={{ fontSize: '0.65rem' }}>
              {isAgentFloat
                ? `₹${AGENT_FLOAT_THRESHOLD} threshold: Dasher pays upfront, reimbursed weekly. Order is under ₹${AGENT_FLOAT_THRESHOLD}.`
                : `Order is ₹${AGENT_FLOAT_THRESHOLD}+: You pay via UPI when Dasher arrives at your door.`}
            </div>

            {/* Commission */}
            <div className="comm-wrap">
              <div className="comm-row">
                <span className="comm-prefix">₹</span>
                <input
                  className="comm-num"
                  type="number"
                  min={minComm}
                  value={commission}
                  onChange={(e) => setCommission(Math.max(minComm, Number(e.target.value)))}
                />
              </div>
              <div className="comm-hint">MIN ₹{minComm} for {ZONE_LABELS[zone]} orders</div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={placeOrder} disabled={loading || !user}>
              {loading ? <span className="spinner" /> : 'Post Order →'}
            </button>

            {!user && (
              <div className="login-foot">
                <a href="/login">Login to place an order →</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
