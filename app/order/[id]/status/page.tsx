'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { ORDER_STATUS_STEPS } from '@/lib/constants';
import Nav from '@/components/Nav';
import type { Order } from '@/types';
import QRCode from 'react-qr-code';

const DASHR_UPI_ID = 'dashr@upi'; // Replace with actual UPI ID

export default function OrderStatusPage() {
  const { id } = useParams() as { id: string };
  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single();
        const p = profile as { name: string; role: string } | null;
        if (p) setUser({ name: p.name, role: p.role });
      }

      // Load order + agent info
      const { data } = await supabase
        .from('orders')
        .select('*, agent:agent_id(id, name, rating)')
        .eq('id', id)
        .single();
      setOrder(data as Order);
      setLoading(false);
    }
    init();

    // Realtime subscription
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

  const upiPaymentString = `upi://pay?pa=${DASHR_UPI_ID}&pn=DASHR&am=${order.order_value}&cu=INR&tn=DASHR_ORDER_${shortId}`;

  return (
    <>
      <Nav role={user?.role as 'customer'} userName={user?.name} />

      <div style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '56rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="type-label" style={{ marginBottom: '0.5rem' }}>Live Order Status</div>
          <div className="type-h1">Track Your <span style={{ color: 'var(--yellow)' }}>Order.</span></div>
        </div>

        <div className="tracker">
          <div className="tracker-head">
            <div>
              <div className="tr-id">ORDER_#{shortId}</div>
              <div className="tr-item">{order.item_description.slice(0, 50)}</div>
              {agentInfo?.name && (
                <div className="type-label" style={{ marginTop: '0.4rem' }}>
                  Dasher: {agentInfo.name} ★ {agentInfo.rating?.toFixed(1)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${order.status === 'delivered' ? 'badge-gf' : order.status === 'cancelled' ? 'badge-r' : order.status === 'picked_up' ? 'badge-o' : order.status === 'assigned' ? 'badge-b' : 'badge-y'}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
              <div className="type-label" style={{ marginTop: '0.4rem' }}>
                ₹{order.commission_amount} commission
              </div>
              <div className="type-label">
                {order.payment_method === 'agent_float' ? '💳 Agent Float' : '📱 UPI On Delivery'}
              </div>
            </div>
          </div>

          <div className="tracker-body">
            <div className="status-track">
              {ORDER_STATUS_STEPS.map((step, i) => {
                const isDone = i < currentStepIdx || order.status === 'delivered';
                const isActive = i === currentStepIdx && order.status !== 'cancelled';

                return (
                  <>
                    {i > 0 && (
                      <div key={`line-${i}`} className={`status-line ${i <= currentStepIdx ? 'done' : ''}`} />
                    )}
                    <div className="status-step" key={step.key}>
                      <div className={`status-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                        {isDone ? '✓' : step.icon}
                      </div>
                      <div className={`status-lbl ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                        {step.label}
                      </div>
                    </div>
                  </>
                );
              })}
            </div>
          </div>
        </div>

        {/* UPI QR when picked_up and upi_on_delivery */}
        {order.status === 'picked_up' && order.payment_method === 'upi_on_delivery' && (
          <div style={{ marginTop: '2rem', background: 'var(--surf)', border: '0.2rem solid var(--yellow)', padding: '2rem', boxShadow: 'var(--sh-y)', textAlign: 'center' }}>
            <div className="sec-label" style={{ justifyContent: 'center', display: 'flex' }}>📱 UPI Payment</div>
            <div className="type-h1" style={{ margin: '1rem 0' }}>Pay ₹{order.order_value}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'white', border: '0.2rem solid var(--ink)', boxShadow: 'var(--sh)' }}>
                <QRCode value={upiPaymentString} size={180} />
              </div>
            </div>
            <div className="type-label" style={{ color: 'var(--yellow)' }}>Scan to pay before Dasher marks delivered</div>
            <div className="type-label" style={{ marginTop: '0.5rem' }}>{DASHR_UPI_ID}</div>
          </div>
        )}

        {/* Order details */}
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', gap: '1rem' }}>
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

        {order.status === 'cancelled' && (
          <div className="notice notice-r" style={{ marginTop: '2rem' }}>
            This order was cancelled. <a href="/order" style={{ color: 'var(--yellow)' }}>Place a new order →</a>
          </div>
        )}

        {order.status === 'delivered' && (
          <div className="notice notice-g" style={{ marginTop: '2rem' }}>
            ✓ Your order has been delivered! Enjoy 🎉
          </div>
        )}
      </div>
    </>
  );
}
