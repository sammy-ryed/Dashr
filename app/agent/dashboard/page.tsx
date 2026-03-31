'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ZONE_LABELS } from '@/lib/constants';
import OrderCard from '@/components/OrderCard';
import type { Order, User } from '@/types';
import type { Zone } from '@/lib/constants';

function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export default function AgentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [agent, setAgent] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [weeklyUnpaid, setWeeklyUnpaid] = useState(0);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .order('commission_amount', { ascending: false });
    setOrders((data as Order[]) || []);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!profile || profile.role !== 'agent') { router.push('/order'); return; }
      setAgent(profile as User);

      await loadOrders();

      // Weekly unpaid sum
      const { data: ledger } = await supabase
        .from('ledger')
        .select('amount')
        .eq('agent_id', user.id)
        .eq('is_paid', false);
      setWeeklyUnpaid((ledger || []).reduce((sum: number, e: {amount: number}) => sum + e.amount, 0));

      setLoading(false);
    }
    init();

    // Realtime subscription for new orders
    const channel = supabase
      .channel('pending-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.pending',
      }, loadOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function toggleOnline() {
    if (!agent) return;
    const newState = !agent.is_online;
    await supabase.from('users').update({ is_online: newState }).eq('id', agent.id);
    setAgent({ ...agent, is_online: newState });
    if (newState) await loadOrders();
  }

  async function acceptOrder(orderId: string) {
    if (!agent) return;
    setAccepting(orderId);
    await supabase.from('orders').update({
      agent_id: agent.id,
      status: 'assigned',
    }).eq('id', orderId).eq('status', 'pending');
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setAccepting(null);
    router.push('/agent/active');
  }

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(agent?.rating || 5));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
      </div>
    );
  }

  return (
    <div>
      <nav className="nav">
        <span className="nav-logo">DASHR<sup>SRM</sup></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>
          <span style={{ color: agent?.is_online ? 'var(--green)' : 'var(--muted)' }}>
            {agent?.is_online ? '● ONLINE' : '○ OFFLINE'}
          </span>
        </div>
      </nav>

      <div className="dash-wrap" style={{ margin: '0' }}>
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sb-head">
            <div className="sb-agent-name">{agent?.name?.split(' ')[0] || 'Dasher'}</div>
            <div className="sb-agent-meta">
              {agent?.srm_id || 'SRM ID'} · ★ {agent?.rating?.toFixed(1)}
            </div>
            <div
              className="sb-toggle toggle-row"
              onClick={toggleOnline}
              style={{ cursor: 'pointer' }}
            >
              <div className={`toggle-track ${agent?.is_online ? 'on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
              <span className="toggle-lbl" style={{ color: agent?.is_online ? 'var(--green)' : 'var(--muted)', fontSize: '0.65rem' }}>
                {agent?.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <nav className="sb-nav">
            <Link href="/agent/dashboard" className="active">⬡ &nbsp;Live Feed</Link>
            <Link href="/agent/active">◈ &nbsp;Active Delivery</Link>
            <Link href="/agent/ledger">≡ &nbsp;My Ledger</Link>
          </nav>

          <div className="sb-earnings">
            <div className="sb-earn-lbl">Unpaid This Week</div>
            <div className="sb-earn-val">₹{weeklyUnpaid}</div>
            <div className="sb-earn-wk">Week: {getWeekStart()}</div>
          </div>
        </aside>

        {/* Main feed */}
        <div className="dash-main">
          <div className="dash-topbar">
            <div className="dash-title">Live Feed</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              {agent?.is_online && (
                <div className="live-dot-wrap">
                  <div className="live-dot" />
                  {orders.length} order{orders.length !== 1 ? 's' : ''} available
                </div>
              )}
              {(agent?.rating || 0) >= 4.5 && (
                <span className="badge badge-yf">Priority Queue</span>
              )}
            </div>
          </div>

          <div className="dash-feed">
            {!agent?.is_online ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="type-h2" style={{ marginBottom: '1rem' }}>You are offline</div>
                <div className="type-label" style={{ marginBottom: '1.5rem' }}>Toggle online to see and accept orders</div>
                <button className="btn btn-dark btn-lg" onClick={toggleOnline}>Go Online →</button>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="type-h2" style={{ marginBottom: '0.5rem' }}>No pending orders</div>
                <div className="type-label">New orders will appear here in real time</div>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} style={{ opacity: accepting === order.id ? 0.5 : 1 }}>
                  <OrderCard
                    order={order}
                    onAccept={acceptOrder}
                    showActions={!accepting}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
