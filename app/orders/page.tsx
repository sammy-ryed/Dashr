'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';
import type { Order } from '@/types';
import { ZONE_LABELS } from '@/lib/config';

const statusBadgeClass: Record<string, string> = {
  pending:    'badge badge-y',
  assigned:   'badge badge-b',
  picked_up:  'badge badge-o',
  delivered:  'badge badge-gf',
  cancelled:  'badge badge-r',
};

const statusLabels: Record<string, string> = {
  pending:    'Pending',
  assigned:   'Assigned',
  picked_up:  'Picked Up',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('name, role').eq('id', authUser.id).single();
      const p = profile as { name: string; role: string } | null;
      if (p) setUser({ id: authUser.id, name: p.name || '', role: p.role });

      const { data } = await supabase
        .from('orders')
        .select('*, agent:agent_id(name, rating)')
        .eq('customer_id', authUser.id)
        .order('created_at', { ascending: false });

      setOrders((data as Order[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const activeCount = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  return (
    <>
      <Nav role={user?.role as 'customer'} userName={user?.name} isLoading={loading} />
      <MarqueeBar />

      <div className="page-enter" style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '72rem', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div className="sec-label">Order History</div>
          <div className="type-h1">My <span style={{ color: 'var(--yellow)' }}>Orders.</span></div>
        </div>

        {/* Stats */}
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="sc-val">{orders.length}</div>
            <div className="sc-lbl">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="sc-val">{activeCount}</div>
            <div className="sc-lbl">Active</div>
          </div>
          <div className="stat-card">
            <div className="sc-val">{orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.order_value, 0)}</div>
            <div className="sc-lbl">Total Spent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-row" style={{ marginBottom: '1.5rem', gap: '0.5rem' }}>
          {['all', 'pending', 'assigned', 'picked_up', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-dark' : 'btn-ghost'}`}
              onClick={() => setFilter(s)}
              style={{ fontSize: '0.55rem', padding: '0.4em 0.8em' }}
            >
              {s === 'all' ? `All ${orders.length}` : `${statusLabels[s]} ${orders.filter((o) => o.status === s).length}`}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="type-h2" style={{ marginBottom: '1rem' }}>
              {filter === 'all' ? 'No orders yet' : `No ${filter.replace('_', ' ')} orders`}
            </div>
            <div className="type-label" style={{ marginBottom: '1.5rem' }}>
              {filter === 'all' ? 'Place your first order to get started' : 'Try a different filter'}
            </div>
            {filter === 'all' && <Link href="/order" className="btn btn-primary btn-lg">Place Order</Link>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filtered.map((order) => {
              const shortId = order.id.slice(-4).toUpperCase();
              const agentInfo = order.agent as any;
              const isActive = !['delivered', 'cancelled'].includes(order.status);
              return (
                <Link href={`/order/${order.id}/status`} key={order.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="order-card" style={isActive ? { borderColor: 'var(--yellow)', boxShadow: 'var(--sh-y)' } : {}}>
                    <div className="oc-head">
                      <span className="oc-id">ORDER_#{shortId}</span>
                      <span className={statusBadgeClass[order.status]}>{statusLabels[order.status]}</span>
                    </div>
                    <div className="oc-title">{order.item_description.slice(0, 60)}{order.item_description.length > 60 ? '...' : ''}</div>
                    <div className="oc-meta">From: {order.pickup_location} — To: {order.delivery_hostel} {order.delivery_room}</div>
                    {agentInfo?.name && <div className="oc-meta">Dasher: {agentInfo.name} — {agentInfo.rating?.toFixed(1)}</div>}
                    <div className="oc-foot">
                      <div>
                        <div className="oc-comm">{order.order_value}</div>
                        <span className="badge badge-y" style={{ marginTop: '0.3rem', display: 'inline-block', fontSize: '0.5rem' }}>
                          {ZONE_LABELS[order.pickup_zone]}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--muted)' }}>
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isActive && <div className="type-label" style={{ color: 'var(--yellow)', marginTop: '0.3rem', fontSize: '0.55rem' }}>TRACK</div>}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
