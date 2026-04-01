'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ORDER_STATUS_STEPS, FEATURES, UPI_ID } from '@/lib/config';
import Nav from '@/components/Nav';
import RatingModal from '@/components/RatingModal';
import type { Order } from '@/types';

export default function OrderStatusPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('users').select('name, role').eq('id', authUser.id).single();
        const p = profile as { name: string; role: string } | null;
        if (p) setUser({ id: authUser.id, name: p.name, role: p.role });

        // Check if user already rated this order
        const { data: existingRating } = await supabase
          .from('ratings')
          .select('id')
          .eq('order_id', id)
          .eq('rater_id', authUser.id)
          .single();
        if (existingRating) setHasRated(true);
      }

      const { data } = await supabase
        .from('orders')
        .select('*, agent:agent_id(id, name, rating, phone)')
        .eq('id', id)
        .single();
      setOrder(data as Order);
      setLoading(false);
    }
    init();

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`,
      }, (payload: { new: Partial<Order> }) => {
        setOrder((prev) => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function cancelOrder() {
    if (!order || !user) return;
    setCancelling(true);
    setCancelError('');

    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, userId: user.id }),
      });
      const data = await res.json();
      if (!data.ok) { setCancelError(data.error || 'Failed to cancel'); }
      else { setOrder((prev) => prev ? { ...prev, status: 'cancelled' } : null); }
    } catch { setCancelError('Network error.'); }
    setCancelling(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="notice notice-r">Order not found.</div>
      </div>
    );
  }

  const currentStepIdx = ORDER_STATUS_STEPS.findIndex((s) => s.key === order.status);
  const shortId = order.id.slice(-4).toUpperCase();
  const agentInfo = order.agent as any;
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';

  return (
    <>
      <Nav role={user?.role as 'customer'} userName={user?.name} isLoading={loading} />

      <div className="page-enter" style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="sec-label">Live Order Status</div>
          <div className="type-h1">Track Your <span style={{ color: 'var(--yellow)' }}>Order.</span></div>
        </div>

        {/* Status tracker */}
        <div className="tracker">
          <div className="tracker-head">
            <div>
              <div className="tr-id">ORDER_#{shortId}</div>
              <div className="tr-item">{order.item_description.slice(0, 50)}</div>
              {agentInfo?.name && (
                <div className="type-label" style={{ marginTop: '0.4rem' }}>
                  Dasher: {agentInfo.name} — {agentInfo.rating?.toFixed(1)} rating
                </div>
              )}
              {/* Call Dasher button — visible once order is assigned */}
              {agentInfo?.phone && order.status !== 'pending' && order.status !== 'cancelled' && (
                <a
                  href={`tel:${agentInfo.phone}`}
                  className="btn btn-sm btn-primary"
                  style={{ marginTop: '0.5rem', fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  📞 Call Dasher
                </a>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${order.status === 'delivered' ? 'badge-gf' : order.status === 'cancelled' ? 'badge-r' : order.status === 'picked_up' ? 'badge-o' : order.status === 'assigned' ? 'badge-b' : 'badge-y'}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <div className="type-label" style={{ marginTop: '0.4rem' }}>
                Commission: ₹{order.commission_amount}
              </div>
              <div className="type-label">
                {order.payment_method === 'agent_float' ? 'Dasher Float' : 'UPI On Delivery'}
              </div>
            </div>
          </div>

          <div className="tracker-body">
            <div className="status-track">
              {ORDER_STATUS_STEPS.map((step, i) => {
                const isDone = i < currentStepIdx || order.status === 'delivered';
                const isActive = i === currentStepIdx && order.status !== 'cancelled';
                return (
                  <div key={step.key} style={{ display: 'contents' }}>
                    {i > 0 && (
                      <div className={`status-line ${i <= currentStepIdx ? 'done' : ''}`} />
                    )}
                    <div className="status-step">
                      <div className={`status-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                        {isDone ? '✓' : step.icon}
                      </div>
                      <div className={`status-lbl ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                        {step.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* UPI section — feature-flagged */}
        {FEATURES.UPI_PAYMENTS && order.status === 'picked_up' && order.payment_method === 'upi_on_delivery' && (
          <div style={{ marginTop: '2rem', background: 'var(--surf)', border: '0.2rem solid var(--yellow)', padding: '2rem', boxShadow: 'var(--sh-y)', textAlign: 'center' }}>
            <div className="sec-label" style={{ justifyContent: 'center', display: 'flex' }}>UPI Payment</div>
            <div className="type-h1" style={{ margin: '1rem 0' }}>Pay ₹{order.order_value}</div>
            <div className="type-label" style={{ color: 'var(--yellow)' }}>Pay via UPI when Dasher arrives</div>
            <div className="type-label" style={{ marginTop: '0.5rem' }}>{UPI_ID}</div>
          </div>
        )}

        {/* Payment info for customer */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && order.payment_method === 'agent_float' && order.status !== 'pending' && (
          <div className="notice notice-g" style={{ marginTop: '1.5rem' }}>
            Your Dasher has paid upfront for your order. Pay ₹{order.order_value + order.commission_amount} to the Dasher on delivery.
          </div>
        )}

        {/* Details grid */}
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: '1rem' }}>
          <div className="stat-card">
            <div className="sc-lbl">Pickup</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--white)', marginTop: '0.4rem' }}>
              {order.pickup_location}
            </div>
            <div className="sc-lbl" style={{ marginTop: '0.3rem' }}>{order.pickup_zone.replace('_', ' ').toUpperCase()}</div>
          </div>
          <div className="stat-card">
            <div className="sc-lbl">Delivery</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--white)', marginTop: '0.4rem' }}>
              {order.delivery_hostel}, Room {order.delivery_room}
            </div>
          </div>
          <div className="stat-card">
            <div className="sc-lbl">Order Value</div>
            <div className="sc-val">₹{order.order_value}</div>
          </div>
        </div>

        {/* Cancel */}
        {order.status === 'pending' && (
          <div style={{ marginTop: '2rem' }}>
            {cancelError && <div className="notice notice-r" style={{ marginBottom: '1rem' }}>{cancelError}</div>}
            <button className="btn btn-danger btn-block" onClick={cancelOrder} disabled={cancelling}>
              {cancelling ? <span className="spinner" /> : 'Cancel Order'}
            </button>
          </div>
        )}

        {order.status === 'cancelled' && <div className="notice notice-r" style={{ marginTop: '2rem' }}>This order was cancelled.</div>}
        
        {order.status === 'delivered' && (
          <div className="notice notice-g" style={{ marginTop: '2rem' }}>
            Delivered successfully! {!hasRated && 'Rate your Dasher below.'}
          </div>
        )}

        {/* Rating prompt for delivered orders */}
        {order.status === 'delivered' && user && user.id === order.customer_id && agentInfo && !hasRated && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowRating(true)}
            >
              ★ Rate Your Dasher
            </button>
          </div>
        )}

        {isTerminal && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/order" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>New Order</Link>
            <Link href="/orders" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Order History</Link>
          </div>
        )}
      </div>

      {/* Rating modal */}
      {showRating && user && agentInfo && (
        <RatingModal
          orderId={order.id}
          raterId={user.id}
          ratedName={agentInfo.name || 'Your Dasher'}
          raterRole="customer"
          onClose={() => setShowRating(false)}
          onSubmitted={() => setHasRated(true)}
        />
      )}
    </>
  );
}
