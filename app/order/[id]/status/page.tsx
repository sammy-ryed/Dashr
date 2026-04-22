'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import { ORDER_STATUS_STEPS, FEATURES, UPI_ID } from '@/lib/config';
import Nav from '@/components/Nav';
import RatingModal from '@/components/RatingModal';
import ReportModal from '@/components/ReportModal';
import ChatDrawer from '@/components/ChatDrawer';
import type { Order } from '@/types';


const RATING_MODAL_DELAY_MS = 300;

export default function OrderStatusPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [ratingPromptDismissed, setRatingPromptDismissed] = useState(false);
  const [delayedAutoOpenOrderId, setDelayedAutoOpenOrderId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Resolved agent id even when join is null (e.g. cancelled orders)
  const resolvedAgentId = (order?.agent as { id?: string } | null)?.id ?? order?.agent_id ?? null;
  const resolvedAgentName = (order?.agent as { name?: string } | null)?.name ?? 'Dasher';

  useEffect(() => {
    async function init() {
      const authUser = await getUserSafe(supabase);
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

  useEffect(() => {
    if (!order || !user) return;

    const shouldQueueAutoOpen =
      order.status === 'delivered' &&
      user.id === order.customer_id &&
      !hasRated &&
      !ratingPromptDismissed &&
      delayedAutoOpenOrderId !== order.id;

    if (!shouldQueueAutoOpen) return;

    const timer = setTimeout(() => {
      setDelayedAutoOpenOrderId(order.id);
    }, RATING_MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [order, user, hasRated, ratingPromptDismissed, delayedAutoOpenOrderId]);

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
  const agentInfo = order.agent as { id?: string; name?: string; rating?: number; phone?: string } | null;
  const isTerminal = order.status === 'delivered' || order.status === 'cancelled';
  const shouldAutoShowRating =
    delayedAutoOpenOrderId === order.id &&
    order.status === 'delivered' &&
    !!user &&
    user.id === order.customer_id &&
    !hasRated &&
    !ratingPromptDismissed;

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
              {/* Dasher Contact Card */}
              {agentInfo?.phone && order.status !== 'pending' && order.status !== 'cancelled' && (
                <div style={{
                  marginTop: '0.8rem', padding: '0.7rem', background: 'var(--surf2)',
                  border: '0.14rem solid var(--yellow)', display: 'flex', alignItems: 'center',
                  gap: '0.8rem', flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1, minWidth: '8rem' }}>
                    <div className="type-label" style={{ fontSize: '0.55rem', marginBottom: '0.2rem' }}>DASHER CONTACT</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', color: 'var(--yellow)' }}>
                      {agentInfo.name} · {agentInfo.phone}
                    </div>
                  </div>
                  <a
                    href={`tel:${agentInfo.phone}`}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.6rem', whiteSpace: 'nowrap' }}
                  >
                    Call Now
                  </a>
                </div>
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
                {order.payment_method === 'agent_float' ? `₹${order.order_value} Prepaid` : `Pay ₹${order.order_value} on Delivery`}
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
          <div className="notice notice-g" style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.4rem' }}>✓</span>
            Delivered successfully! {!hasRated && 'Rate your Dasher below.'}
          </div>
        )}

        {/* Rating prompt for delivered orders */}
        {order.status === 'delivered' && user && user.id === order.customer_id && !hasRated && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', animation: 'fadeInUp 0.5s ease' }}>
            <div className="type-label" style={{ marginBottom: '0.8rem', color: 'var(--yellow)' }}>How was your delivery experience?</div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowRating(true)}
              style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
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

        {/* Report Dasher — visible for any order that ever had a dasher (all statuses after pending) */}
        {resolvedAgentId && order.status !== 'pending' && user && user.id === order.customer_id && (
          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '0.58rem', color: 'var(--muted)', borderColor: 'var(--muted)', boxShadow: 'none' }}
              onClick={() => setShowReport(true)}
            >
              {isTerminal ? 'Had an issue? Report Dasher' : 'Report Dasher'}
            </button>
          </div>
        )}
      </div>

      {/* Rating modal */}
      {(showRating || shouldAutoShowRating) && user && (
        <RatingModal
          orderId={order.id}
          raterId={user.id}
          ratedName={agentInfo?.name || 'Your Dasher'}
          raterRole="customer"
          onClose={() => {
            setShowRating(false);
            setRatingPromptDismissed(true);
          }}
          onSubmitted={() => {
            setHasRated(true);
            setShowRating(false);
            setRatingPromptDismissed(true);
          }}
        />
      )}

      {/* Report Dasher modal */}
      {showReport && resolvedAgentId && (
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          reportedId={resolvedAgentId}
          reportedName={resolvedAgentName}
          orderId={order.id}
        />
      )}

      {/* In-app chat — visible once a dasher is assigned.
           offsetButton: shift the chat FAB upward so it doesn't overlap the Report Dasher button. */}
      {user && order.agent_id && (
        <ChatDrawer
          orderId={order.id}
          currentUserId={user.id}
          otherPartyName={agentInfo?.name || 'Dasher'}
          orderStatus={order.status}
          offsetButton={!!(resolvedAgentId && order.status !== 'pending' && user && user.id === order.customer_id)}
        />
      )}
    </>
  );
}
