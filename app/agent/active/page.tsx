'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import AgentShell from '@/components/AgentShell';
import RatingModal from '@/components/RatingModal';
import ReportModal from '@/components/ReportModal';
import type { Order } from '@/types';

const MAX_ACTIVE_ORDERS = 3;
const RATING_MODAL_DELAY_MS = 300;

interface DeliveredRatingTarget {
  id: string;          // order id
  customerName: string;
  customerId: string;
  orderId: string;     // same as id, kept for clarity
};

export default function AgentActivePage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [ratingQueue, setRatingQueue] = useState<DeliveredRatingTarget[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string; orderId: string } | null>(null);

  useEffect(() => {
    async function load() {
      const user = await getUserSafe(supabase);
      if (!user) {
        setLoading(false);
        return;
      }

      setAgentId(user.id);

      const { data } = await supabase
        .from('orders')
        .select('*, customer:customer_id(id, name, phone)')
        .eq('agent_id', user.id)
        .in('status', ['assigned', 'picked_up'])
        .order('created_at', { ascending: false });

      setOrders((data as Order[]) || []);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    if (showRating || ratingQueue.length === 0) return;

    const timer = setTimeout(() => {
      setShowRating(true);
    }, RATING_MODAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [ratingQueue, showRating]);

  async function markPickedUp(orderId: string) {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    setUpdatingOrderId(orderId);
    setError('');

    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: target.id, status: 'picked_up' }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Failed to update order status.');
        setUpdatingOrderId(null);
        return;
      }

      setOrders((prev) => prev.map((o) => (o.id === target.id ? { ...o, status: 'picked_up' } : o)));
    } catch {
      setError('Network error while updating order.');
    }

    setUpdatingOrderId(null);
  }

  async function markDelivered(orderId: string) {
    if (!agentId) return;

    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    setUpdatingOrderId(orderId);
    setError('');

    try {
      const res = await fetch('/api/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: target.id, status: 'delivered' }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || 'Failed to mark delivery complete.');
        setUpdatingOrderId(null);
        return;
      }
    } catch {
      setError('Network error while updating order.');
      setUpdatingOrderId(null);
      return;
    }

    // Ledger insert and total_deliveries increment are handled server-side
    // in /api/orders/update-status for data integrity

    setOrders((prev) => prev.filter((o) => o.id !== target.id));

    const customerInfo = target.customer;
    setRatingQueue((prev) => [
      ...prev,
      {
        id: target.id,
        customerName: customerInfo?.name || 'Customer',
        customerId: customerInfo?.id || target.customer_id,
        orderId: target.id,
      },
    ]);

    setUpdatingOrderId(null);
  }

  const currentRatingTarget = ratingQueue[0] || null;

  return (
    <AgentShell>
      <div className="dash-topbar">
        <div className="dash-title">Active Deliveries</div>
        <span className={`badge ${orders.length >= MAX_ACTIVE_ORDERS ? 'badge-r' : 'badge-b'}`}>
          {orders.length}/{MAX_ACTIVE_ORDERS} In Progress
        </span>
      </div>

      <div className="dash-feed" style={{ padding: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : orders.length === 0 && !showRating ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="type-h2" style={{ marginBottom: '1rem' }}>No active delivery</div>
            <div className="type-label" style={{ marginBottom: '1.5rem' }}>Accept an order from the live feed</div>
            <Link href="/agent/dashboard" className="btn btn-primary btn-lg">Go to Live Feed</Link>
          </div>
        ) : (
          <>
            {orders.length > 0 && (
              <div className="type-label" style={{ marginBottom: '1rem' }}>
                {MAX_ACTIVE_ORDERS - orders.length > 0
                  ? `You can still take ${MAX_ACTIVE_ORDERS - orders.length} more order${MAX_ACTIVE_ORDERS - orders.length > 1 ? 's' : ''}.`
                  : 'You are at max active deliveries.'}
              </div>
            )}

            {error && <div className="notice notice-r" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map((order) => {
                const shortId = order.id.slice(-4).toUpperCase();
                const customerInfo = order.customer || null;
                const isUpdating = updatingOrderId === order.id;

                return (
                  <div key={order.id} className="order-card" style={{ opacity: isUpdating ? 0.6 : 1 }}>
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
                            Call {customerInfo.phone}
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
                        {order.payment_method === 'agent_float' ? `₹${order.order_value} Prepaid` : `Pay ₹${order.order_value} on Delivery`}
                      </span>
                    </div>

                    {order.payment_method === 'agent_float' && (
                      <div className="notice notice-g" style={{ marginTop: '0.8rem' }}>
                        You paid ₹{order.order_value} upfront. Customer pays you ₹{order.order_value + order.commission_amount} on delivery.
                      </div>
                    )}

                    {order.payment_method === 'upi_on_delivery' && (
                      <div className="notice notice-y" style={{ marginTop: '0.8rem' }}>
                        Customer pays ₹{order.order_value} directly to you on delivery. Your commission: ₹{order.commission_amount}.
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                      {order.status === 'assigned' && (
                        <button className="btn btn-ghost btn-lg btn-block" onClick={() => markPickedUp(order.id)} disabled={isUpdating}>
                          {isUpdating ? <span className="spinner" /> : 'Mark Picked Up'}
                        </button>
                      )}
                      {order.status === 'picked_up' && (
                        <button className="btn btn-primary btn-lg btn-block" onClick={() => markDelivered(order.id)} disabled={isUpdating}>
                          {isUpdating ? <span className="spinner" /> : 'Mark Delivered'}
                        </button>
                      )}
                      {/* Report Customer */}
                      {customerInfo?.id && (
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: '0.58rem', color: 'var(--muted)', borderColor: 'var(--muted)', boxShadow: 'none', marginTop: '0.4rem' }}
                          onClick={() => setReportTarget({ id: customerInfo.id, name: customerInfo.name || 'Customer', orderId: order.id })}
                        >
                          Report Customer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {showRating && currentRatingTarget && agentId && (
          <RatingModal
            orderId={currentRatingTarget.id}
            raterId={agentId}
            ratedName={currentRatingTarget.customerName}
            raterRole="dasher"
            onClose={() => {
              setShowRating(false);
              setRatingQueue((prev) => prev.slice(1));
            }}
            onSubmitted={() => {
              setShowRating(false);
              setRatingQueue((prev) => prev.slice(1));
            }}
            onReport={() => {
              setRatingQueue((prev) => prev.slice(1));
              setReportTarget({
                id: currentRatingTarget.customerId,
                name: currentRatingTarget.customerName,
                orderId: currentRatingTarget.orderId,
              });
            }}
          />
        )}

        {/* Report Customer modal */}
        {reportTarget && (
          <ReportModal
            isOpen={!!reportTarget}
            onClose={() => setReportTarget(null)}
            reportedId={reportTarget.id}
            reportedName={reportTarget.name}
            orderId={reportTarget.orderId}
          />
        )}
      </div>
    </AgentShell>
  );
}
