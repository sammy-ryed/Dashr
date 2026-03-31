'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import type { Order } from '@/types';

export default function AgentActivePage() {
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setAgentId(user.id);

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('agent_id', user.id)
        .in('status', ['assigned', 'picked_up'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setOrder(data as Order | null);
      setLoading(false);
    }
    load();
  }, []);

  async function markPickedUp() {
    if (!order) return;
    setUpdating(true);
    await supabase.from('orders').update({ status: 'picked_up' }).eq('id', order.id);
    setOrder({ ...order, status: 'picked_up' });
    setUpdating(false);
  }

  async function markDelivered() {
    if (!order || !agentId) return;
    if (order.payment_method === 'upi_on_delivery' && !upiConfirmed) {
      setError('Please confirm UPI payment collected before marking as delivered.');
      return;
    }
    setUpdating(true);
    setError('');

    // Update order
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id);

    // Log commission to ledger
    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).toISOString().split('T')[0];
    })();

    const ledgerEntries = [
      { agent_id: agentId, order_id: order.id, type: 'commission', amount: order.commission_amount, week_start: weekStart },
    ];
    if (order.payment_method === 'agent_float') {
      ledgerEntries.push({ agent_id: agentId, order_id: order.id, type: 'reimbursement', amount: order.order_value, week_start: weekStart });
    }
    await supabase.from('ledger').insert(ledgerEntries);

    // Increment total_deliveries
    const { data: currentUser } = await supabase.from('users').select('total_deliveries').eq('id', agentId).single();
    await supabase.from('users').update({ total_deliveries: (currentUser?.total_deliveries || 0) + 1 }).eq('id', agentId);

    setOrder(null);
    router.push('/agent/dashboard');
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
    </div>
  );

  const shortId = order?.id.slice(-4).toUpperCase();

  return (
    <div>
      <nav className="nav">
        <span className="nav-logo">DASHR<sup>SRM</sup></span>
        <ul className="nav-links">
          <li><Link href="/agent/dashboard">Feed</Link></li>
          <li><Link href="/agent/active" className="active">Active</Link></li>
          <li><Link href="/agent/ledger">Ledger</Link></li>
        </ul>
      </nav>

      <div style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '40rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="type-label" style={{ marginBottom: '0.5rem' }}>Active Delivery</div>
          <div className="type-h1">Current <span style={{ color: 'var(--yellow)' }}>Job.</span></div>
        </div>

        {!order ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div className="type-h2" style={{ marginBottom: '1rem' }}>No active delivery</div>
            <div className="type-label" style={{ marginBottom: '1.5rem' }}>Accept an order from the live feed</div>
            <Link href="/agent/dashboard" className="btn btn-primary btn-lg">Go to Live Feed →</Link>
          </div>
        ) : (
          <>
            {/* Order details card */}
            <div className="order-card" style={{ marginBottom: '1.5rem' }}>
              <div className="oc-head">
                <span className="oc-id">ORDER_#{shortId}</span>
                <span className={`badge ${order.status === 'assigned' ? 'badge-b' : 'badge-o'}`}>
                  {order.status === 'assigned' ? 'Assigned' : 'Picked Up'}
                </span>
              </div>
              <div className="oc-title">{order.item_description}</div>
              <div className="oc-meta" style={{ marginTop: '0.5rem' }}>📍 Pickup: {order.pickup_location}</div>
              <div className="oc-meta">🏠 Deliver: {order.delivery_hostel}, Room {order.delivery_room}</div>
              <div className="oc-meta">📦 Order value: ₹{order.order_value}</div>
              <div className="oc-foot">
                <div>
                  <div className="oc-comm">₹{order.commission_amount}</div>
                  <div className="type-label" style={{ marginTop: '0.3rem' }}>your commission</div>
                </div>
                <span className={order.payment_method === 'agent_float' ? 'badge badge-w' : 'badge badge-r'}>
                  {order.payment_method === 'agent_float' ? 'Agent Float' : 'UPI On Delivery'}
                </span>
              </div>
            </div>

            {/* UPI reminder */}
            {order.payment_method === 'upi_on_delivery' && order.status === 'picked_up' && (
              <div className="notice notice-y" style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.7rem' }}>
                  💳 Collect UPI payment of <strong>₹{order.order_value}</strong> from customer before marking delivered.
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: '0.68rem' }}>
                  <input type="checkbox" checked={upiConfirmed} onChange={(e) => setUpiConfirmed(e.target.checked)} />
                  I have collected the UPI payment
                </label>
              </div>
            )}

            {order.payment_method === 'agent_float' && (
              <div className="notice notice-g" style={{ marginBottom: '1.5rem' }}>
                💰 You paid upfront. ₹{order.order_value + order.commission_amount} will be reimbursed in your next weekly payout.
              </div>
            )}

            {error && <div className="notice notice-r" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.status === 'assigned' && (
                <button
                  className="btn btn-ghost btn-lg btn-block"
                  onClick={markPickedUp}
                  disabled={updating}
                >
                  {updating ? <span className="spinner" /> : 'Mark Picked Up →'}
                </button>
              )}
              {order.status === 'picked_up' && (
                <button
                  className="btn btn-primary btn-lg btn-block"
                  onClick={markDelivered}
                  disabled={updating || (order.payment_method === 'upi_on_delivery' && !upiConfirmed)}
                >
                  {updating ? <span className="spinner" /> : 'Mark Delivered ✓'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
