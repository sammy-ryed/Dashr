'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import OrderCard from '@/components/OrderCard';
import AgentShell from '@/components/AgentShell';
import type { Order, User } from '@/types';

export default function AgentDashboard() {
  const supabase = createClient();

  const [agent, setAgent] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .neq('customer_id', userId)
      .order('commission_amount', { ascending: false });
    setOrders((data as Order[]) || []);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (!profile || profile.role !== 'agent') return;
      setAgent(profile as User);

      await loadOrders(user.id);
      setLoading(false);
    }
    init();

    const channel = supabase
      .channel('pending-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.pending',
      }, () => {
        setAgent((curr) => {
          if (curr?.id) loadOrders(curr.id);
          return curr;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function acceptOrder(orderId: string) {
    if (!agent) return;
    setAccepting(orderId);
    setAcceptError('');

    try {
      const res = await fetch('/api/orders/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, agentId: agent.id }),
      });
      const data = await res.json();

      if (!data.ok) {
        setAcceptError(data.error || 'Failed to accept order');
        setAccepting(null);
        return;
      }

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setAccepting(null);
      window.location.href = '/agent/active';
    } catch {
      setAcceptError('Network error. Try again.');
      setAccepting(null);
    }
  }

  return (
    <AgentShell>
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

      {/* Verification guard */}
      {agent && !agent.is_verified && (
        <div className="notice notice-y" style={{ margin: '1rem' }}>
          Your account is pending verification. You cannot accept deliveries until an admin approves your ID card.
        </div>
      )}

      {acceptError && (
        <div className="notice notice-r" style={{ margin: '1rem' }}>
          {acceptError}
        </div>
      )}

      <div className="dash-feed">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : !agent?.is_online ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="type-h2" style={{ marginBottom: '1rem' }}>You are offline</div>
            <div className="type-label" style={{ marginBottom: '1.5rem' }}>Toggle online to see and accept orders</div>
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
                onAccept={agent?.is_verified ? acceptOrder : undefined}
                showActions={!accepting && !!agent?.is_verified}
              />
            </div>
          ))
        )}
      </div>
    </AgentShell>
  );
}
