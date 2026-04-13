'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import { format, parseISO } from 'date-fns';
import type { Order, User } from '@/types';

interface AgentPayout {
  agent: User;
  unpaidAmount: number;
  deliveryCount: number;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [stats, setStats] = useState({ ordersToday: 0, activeAgents: 0, pendingPayouts: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'agents' | 'payouts'>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [strikeReason, setStrikeReason] = useState('');
  const [strikingAgent, setStrikingAgent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    async function load() {
      const user = await getUserSafe(supabase);
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/order'); return; }

      const [ordersRes, agentsRes, ledgerRes] = await Promise.all([
        supabase.from('orders').select('*, customer:customer_id(name), agent:agent_id(name)').order('created_at', { ascending: false }),
        supabase.from('users').select('*').eq('role', 'agent').order('rating', { ascending: false }),
        supabase.from('ledger').select('agent_id, amount, is_paid, order_id').eq('is_paid', false),
      ]);

      const allOrders = (ordersRes.data as Order[]) || [];
      const allAgents = (agentsRes.data as User[]) || [];
      const unpaidEntries = ledgerRes.data || [];

      setOrders(allOrders);
      setAgents(allAgents);

      // Build payouts
      const payoutMap = new Map<string, { amount: number; count: Set<string> }>();
      for (const e of unpaidEntries) {
        if (!payoutMap.has(e.agent_id)) payoutMap.set(e.agent_id, { amount: 0, count: new Set() });
        const p = payoutMap.get(e.agent_id)!;
        p.amount += e.amount;
        p.count.add(e.order_id);
      }
      const payoutsArr = allAgents
        .filter((a) => payoutMap.has(a.id))
        .map((a) => {
          const p = payoutMap.get(a.id)!;
          return { agent: a, unpaidAmount: p.amount, deliveryCount: p.count.size };
        })
        .sort((a, b) => b.unpaidAmount - a.unpaidAmount);
      setPayouts(payoutsArr);

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today));
      const totalUnpaid = unpaidEntries.reduce((sum: number, e: {amount: number}) => sum + e.amount, 0);
      setStats({
        ordersToday: todayOrders.length,
        activeAgents: allAgents.filter((a) => a.is_online).length,
        pendingPayouts: totalUnpaid,
      });

      setLoading(false);
    }
    load();
  }, []);

  async function addStrike(agentId: string, reason: string) {
    setActionLoading(agentId);
    const res = await fetch('/api/admin/strikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, reason }),
    });
    const result = await res.json();
    if (result.ok) {
      setAgents((prev) => prev.map((a) => a.id === agentId
        ? { ...a, strikes: a.strikes + 1, is_verified: result.offboarded ? false : a.is_verified }
        : a
      ));
    }
    setStrikingAgent(null);
    setStrikeReason('');
    setActionLoading('');
  }

  async function markPaid(agentId: string) {
    setActionLoading(agentId);
    await supabase.from('ledger').update({ is_paid: true }).eq('agent_id', agentId).eq('is_paid', false);
    setPayouts((prev) => prev.filter((p) => p.agent.id !== agentId));
    setStats((s) => ({ ...s, pendingPayouts: Math.max(0, s.pendingPayouts) }));
    setActionLoading('');
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut2, setLoggingOut2] = useState(false);

  async function handleAdminLogout() {
    setLoggingOut2(true);
    localStorage.removeItem('dashr_session_start');
    localStorage.removeItem('dashr_last_activity');
    await supabase.auth.signOut();
    router.push('/login');
  }

  // Session management: 16hr auto-logout
  useEffect(() => {
    const SESSION_KEY = 'dashr_session_start';
    const SESSION_MAX_MS = 16 * 60 * 60 * 1000;
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }
    const interval = setInterval(async () => {
      const sessionStart = Number(localStorage.getItem(SESSION_KEY) || Date.now());
      if (Date.now() - sessionStart > SESSION_MAX_MS) {
        localStorage.removeItem(SESSION_KEY);
        await supabase.auth.signOut();
        router.push('/login');
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '2.5rem', height: '2.5rem' }} />
    </div>
  );

  return (
    <div>
      <nav className="nav">
        <span className="nav-logo">DASHR<sup>SRM</sup></span>
        <ul className="nav-links">
          <li><span style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--yellow)', padding: '0 1rem' }}>Admin</span></li>
        </ul>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <button
            className="hamburger hamburger-always"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
      </nav>

      {/* Slide-out menu */}
      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.4rem', borderBottom: '0.14rem solid #2a2a2a' }}>
              <div className="nav-logo" style={{ padding: 0, fontSize: '1.4rem' }}>
                DASHR<sup>SRM</sup>
              </div>
              <div style={{ marginTop: '0.6rem' }}>
                <div className="type-label" style={{ color: 'var(--yellow)' }}>Admin Panel</div>
              </div>
            </div>
            <div style={{ padding: '0.8rem 0', flex: 1 }}>
              <a href="/admin" className="mobile-menu-link active" onClick={() => setMenuOpen(false)}>
                Dashboard
              </a>
            </div>
            <div style={{ padding: '1.2rem 1.4rem', borderTop: '0.14rem solid #2a2a2a' }}>
              <button
                className="btn btn-danger btn-block btn-sm"
                onClick={handleAdminLogout}
                disabled={loggingOut2}
              >
                {loggingOut2 ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="admin-bar">
        <div className="admin-cell">
          <div className="ac-val">{stats.ordersToday}</div>
          <div className="ac-lbl">Orders Today</div>
        </div>
        <div className="admin-cell">
          <div className="ac-val">{stats.activeAgents}</div>
          <div className="ac-lbl">Active Dashers</div>
        </div>
        <div className="admin-cell">
          <div className="ac-val">₹{stats.pendingPayouts >= 1000 ? `${(stats.pendingPayouts / 1000).toFixed(1)}K` : stats.pendingPayouts}</div>
          <div className="ac-lbl">Pending Payouts</div>
        </div>
        <div className="admin-cell">
          <div className="ac-val">{agents.length}</div>
          <div className="ac-lbl">Total Dashers</div>
        </div>
      </div>

      <div className="page-enter" style={{ padding: '2rem clamp(1rem,5vw,4rem)' }}>
        {/* Tabs */}
        <div className="flex-row" style={{ marginBottom: '2rem' }}>
          {(['orders', 'agents', 'payouts'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'orders' ? `Orders (${orders.length})` : t === 'agents' ? `Dashers (${agents.length})` : `Payouts (${payouts.length})`}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <>
            <div className="flex-row" style={{ marginBottom: '1.5rem' }}>
              <div className="type-label">Filter:</div>
              {['all', 'pending', 'assigned', 'picked_up', 'delivered', 'cancelled'].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${statusFilter === s ? 'btn-dark' : 'btn-ghost'}`}
                  onClick={() => setStatusFilter(s)}
                  style={{ fontSize: '0.6rem' }}
                >
                  {s.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ID</th><th>Customer</th><th>Item</th><th>Zone</th>
                    <th>Value</th><th>Commission</th><th>Payment</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => {
                    const cust = (o as any).customer;
                    const shortId = o.id.slice(-4).toUpperCase();
                    return (
                      <tr key={o.id}>
                        <td><span className="type-mono" style={{ fontSize: '0.6rem' }}>#{shortId}</span></td>
                        <td>{cust?.name || '—'}</td>
                        <td style={{ maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.item_description}</td>
                        <td>{o.pickup_zone.replace('_', ' ')}</td>
                        <td className="amt">₹{o.order_value}</td>
                        <td className="amt">₹{o.commission_amount}</td>
                        <td><span className={`badge ${o.payment_method === 'agent_float' ? 'badge-w' : 'badge-r'}`} style={{ fontSize: '0.55rem' }}>{o.payment_method.replace('_', ' ')}</span></td>
                        <td><span className={`badge ${o.status === 'delivered' ? 'badge-gf' : o.status === 'cancelled' ? 'badge-r' : o.status === 'picked_up' ? 'badge-o' : o.status === 'assigned' ? 'badge-b' : 'badge-y'}`} style={{ fontSize: '0.55rem' }}>{o.status.replace('_', ' ')}</span></td>
                        <td>{format(parseISO(o.created_at), 'd MMM')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="agent-card"
                style={agent.strikes >= 3 || !agent.is_verified ? { borderColor: 'var(--danger)', boxShadow: '0.4rem 0.4rem 0 var(--danger)' } : {}}
              >
                <div className="agent-avatar" style={agent.strikes >= 3 ? { background: 'var(--danger)' } : {}}>
                  {(agent.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="agent-name" style={!agent.is_verified ? { color: 'var(--danger)' } : {}}>{agent.name}</div>
                  <div className="agent-meta">★ {agent.rating?.toFixed(1)} · {agent.total_deliveries} deliveries · {agent.srm_id || 'No ID'}</div>
                  {agent.id_card_url && (
                    <a href={agent.id_card_url} target="_blank" rel="noreferrer" className="type-mono" style={{ fontSize: '0.65rem', color: 'var(--blue)', textDecoration: 'none', display: 'inline-block', marginTop: '0.2rem' }}>
                      View ID Card ↗
                    </a>
                  )}
                  <div className="strike-row">
                    <span className="type-label">Strikes:</span>
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className={`strike-dot ${i < agent.strikes ? 'hit' : ''}`} />
                    ))}
                    {!agent.is_verified && (
                      <span className={`badge ${agent.strikes >= 3 ? 'badge-r' : 'badge-y'}`} style={{ marginLeft: '0.5rem' }}>
                        {agent.strikes >= 3 ? 'Offboarded' : 'Pending Verification'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <span className={`badge ${agent.is_online ? 'badge-g' : 'badge-mut'}`}>
                    {agent.is_online ? '● Online' : 'Offline'}
                  </span>
                  {agent.is_verified && agent.strikes < 3 && (
                    strikingAgent === agent.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                        <input
                          className="inp"
                          style={{ fontSize: '0.68rem', padding: '0.3em 0.5em', width: '12rem' }}
                          placeholder="Strike reason..."
                          value={strikeReason}
                          onChange={(e) => setStrikeReason(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-sm btn-ghost" onClick={() => { setStrikingAgent(null); setStrikeReason(''); }}>Cancel</button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => strikeReason && addStrike(agent.id, strikeReason)}
                            disabled={!strikeReason || actionLoading === agent.id}
                          >
                            {actionLoading === agent.id ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Confirm Strike'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => setStrikingAgent(agent.id)}>Add Strike</button>
                    )
                  )}
                  {!agent.is_verified && (
                    <button
                      className="btn btn-sm btn-ghost"
                      disabled={actionLoading === agent.id}
                      onClick={async () => {
                        setActionLoading(agent.id);
                        await supabase.from('users').update({ is_verified: true }).eq('id', agent.id);
                        setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, is_verified: true } : a));
                        setActionLoading('');
                      }}
                    >
                      ✓ Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === 'payouts' && (
          <div style={{ overflowX: 'auto' }}>
            {payouts.length === 0 ? (
              <div className="notice notice-g">All agents have been paid ✓</div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr><th>Dasher</th><th>Deliveries</th><th>Owed</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {payouts.map(({ agent, unpaidAmount, deliveryCount }) => (
                    <tr key={agent.id}>
                      <td>{agent.name}</td>
                      <td>{deliveryCount}</td>
                      <td className="amt">₹{unpaidAmount}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => markPaid(agent.id)}
                          disabled={actionLoading === agent.id}
                        >
                          {actionLoading === agent.id ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
