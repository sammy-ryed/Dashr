'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import AgentShell from '@/components/AgentShell';
import RatingModal from '@/components/RatingModal';
import type { Order } from '@/types';

export default function AgentActivePage() {
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [justDeliveredOrder, setJustDeliveredOrder] = useState<{ id: string; customerName: string; customerId: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAgentId(user.id);

      const { data } = await supabase
        .from('orders')
        .select('*, customer:customer_id(id, name, phone)')
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
    setUpdating(true);
    setError('');

    await supabase.from('orders').update({ status: 'delivered' }).eq('id', order.id);

    const weekStart = (() => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).toISOString().split('T')[0];
    })();

    const ledgerEntries = [
      { agent_id: agentId, order_id: order.id, type: 'commission', amount: order.commission_amount, week_start: weekStart },
    ];
    await supabase.from('ledger').insert(ledgerEntries);

    const { data: currentUser } = await supabase.from('users').select('total_deliveries').eq('id', agentId).single();
    await supabase.from('users').update({ total_deliveries: (currentUser?.total_deliveries || 0) + 1 }).eq('id', agentId);

    const customerInfo = (order as any).customer;
    setJustDeliveredOrder({
      id: order.id,
      customerName: customerInfo?.name || 'Customer',
      customerId: customerInfo?.id || order.customer_id,
    });

    setOrder(null);
    setUpdating(false);
    setShowRating(true);
  }

  const shortId = order?.id.slice(-4).toUpperCase();
  const customerInfo = order ? (order as any).customer : null;

  return (
    <AgentShell>
      <div className="dash-topbar">
        <div className="dash-title">Active Delivery</div>
      </div>

      <div className="dash-feed" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : !order && !showRating ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="type-h2" style={{ marginBottom: '1rem' }}>No active delivery</div>
            <div className="type-label" style={{ marginBottom: '1.5rem' }}>Accept an order from the live feed</div>
            <Link href="/agent/dashboard" className="btn btn-primary btn-lg">Go to Live Feed</Link>
          </div>
        ) : order ? (
          <div style={{ maxWidth: '40rem' }}>
            <div className="order-card" style={{ marginBottom: '1.5rem' }}>
              <div className="oc-head">
                <span className="oc-id">ORDER_#{shortId}</span>
                <span className={`badge ${order.status === 'assigned' ? 'badge-b' : 'badge-o'}`}>
                  {order.status === 'assigned' ? 'Assigned' : 'Picked Up'}
                </span>
              </div>
              <div className="oc-title">{order.item_description}</div>
              <div className="oc-meta" style={{ marginTop: '0.5rem' }}>Pickup: {order.pickup_location}</div>
              <div className="oc-meta">Deliver to: {order.delivery_hostel}, Room {order.delivery_room}</div>
              <div className="oc-meta">Order value: ₹{order.order_value}</div>

              {customerInfo && (
                <div style={{ marginTop: '0.8rem', padding: '0.7rem', background: 'var(--surf2)', border: '0.12rem solid #333' }}>
                  <div className="type-label" style={{ marginBottom: '0.4rem' }}>Customer Contact</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--white)' }}>
                    {customerInfo.name}
                  </div>
                  {customerInfo.phone && (
                    <a href={`tel:${customerInfo.phone}`} className="btn btn-sm btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.6rem' }}>
                      📞 Call {customerInfo.phone}
                    </a>
                  )}
                </div>
              )}

              <div className="oc-foot">
                <div>
                  <div className="oc-comm">₹{order.commission_amount}</div>
                  <div className="type-label" style={{ marginTop: '0.3rem' }}>Your commission</div>
                </div>
                <span className={order.payment_method === 'agent_float' ? 'badge badge-w' : 'badge badge-r'}>
                  {order.payment_method === 'agent_float' ? 'Dasher Float' : 'UPI On Delivery'}
                </span>
              </div>
            </div>

            {order.payment_method === 'agent_float' && (
              <div className="notice notice-g" style={{ marginBottom: '1.5rem' }}>
                You paid ₹{order.order_value} upfront. Customer pays you ₹{order.order_value + order.commission_amount} on delivery.
              </div>
            )}

            {order.payment_method === 'upi_on_delivery' && (
              <div className="notice notice-y" style={{ marginBottom: '1.5rem' }}>
                Customer pays ₹{order.order_value} directly to you on delivery. Your commission: ₹{order.commission_amount}.
              </div>
            )}

            {error && <div className="notice notice-r" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.status === 'assigned' && (
                <button className="btn btn-ghost btn-lg btn-block" onClick={markPickedUp} disabled={updating}>
                  {updating ? <span className="spinner" /> : 'Mark Picked Up'}
                </button>
              )}
              {order.status === 'picked_up' && (
                <button className="btn btn-primary btn-lg btn-block" onClick={markDelivered} disabled={updating}>
                  {updating ? <span className="spinner" /> : 'Mark Delivered ✓'}
                </button>
              )}
            </div>
          </div>
        ) : null}

        {showRating && justDeliveredOrder && agentId && (
          <RatingModal
            orderId={justDeliveredOrder.id}
            raterId={agentId}
            ratedName={justDeliveredOrder.customerName}
            raterRole="dasher"
            onClose={() => {
              setShowRating(false);
              setJustDeliveredOrder(null);
              router.push('/agent/dashboard');
            }}
            onSubmitted={() => {}}
          />
        )}
      </div>
    </AgentShell>
  );
}
