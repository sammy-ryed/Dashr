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

interface Report {
  id: string;
  reason: string;
  notes: string;
  status: string;
  severity: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter: { id: string; name: string; email: string } | null;
  reported: { id: string; name: string; email: string; role: string } | null;
}

interface Ban {
  id: string;
  ban_type: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  user: { id: string; name: string; email: string; role: string } | null;
  admin: { id: string; name: string } | null;
}

interface Appeal {
  id: string;
  appeal_text: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  ban_id: string;
  user_id: string;
}

interface HealthData {
  orders: { last24h: number; lastHour: number };
  users: { onlineNow: number };
  emails: { sentLast24h: number; deliveredLast24h: number; failedLast24h: number; deliveryRate: number };
  moderation: { pendingReports: number; activeBans: number; pendingAppeals: number };
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState({ ordersToday: 0, activeAgents: 0, pendingPayouts: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'agents' | 'payouts' | 'reports' | 'moderation' | 'health'>('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [strikeReason, setStrikeReason] = useState('');
  const [strikingAgent, setStrikingAgent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [banForm, setBanForm] = useState<{ userId: string; reportId: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState('7d');
  const [directBanAgent, setDirectBanAgent] = useState<string | null>(null);
  const [directBanReason, setDirectBanReason] = useState('');
  const [directBanDuration, setDirectBanDuration] = useState('7d');
  const [unbanReason, setUnbanReason] = useState('');
  const [unbanningId, setUnbanningId] = useState<string | null>(null);
  const [appealResponse, setAppealResponse] = useState('');
  const [reviewingAppeal, setReviewingAppeal] = useState<string | null>(null);

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

  async function loadReports() {
    const res = await fetch('/api/admin/reports?limit=100');
    const data = await res.json();
    if (data.ok) setReports(data.reports || []);
  }

  async function loadBans() {
    const res = await fetch('/api/admin/bans?active=true');
    const data = await res.json();
    if (data.ok) setBans(data.bans || []);
    // Also load pending appeals
    const appealRes = await fetch('/api/admin/appeals?status=pending');
    const appealData = await appealRes.json();
    if (appealData.ok) setAppeals(appealData.appeals || []);
  }

  async function loadHealth() {
    const res = await fetch('/api/admin/health');
    const data = await res.json();
    if (data.ok) setHealth(data);
  }

  // Load tab data on demand
  useEffect(() => {
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'moderation') loadBans();
    if (activeTab === 'health') loadHealth();
  }, [activeTab]);

  async function updateReport(reportId: string, update: Record<string, unknown>) {
    setActionLoading(reportId);
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, ...update }),
    });
    const data = await res.json();
    if (data.ok) {
      setReports((prev) => prev.map((r) =>
        r.id === reportId ? { ...r, ...update, status: (update.status as string) || r.status } : r
      ));
    }
    setActionLoading('');
  }

  async function banUser(userId: string, reportId: string) {
    if (!banReason.trim()) return;
    setActionLoading(userId);
    const res = await fetch('/api/admin/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, banType: 'temporary', reason: banReason, duration: banDuration, relatedReportId: reportId }),
    });
    const data = await res.json();
    if (data.ok) {
      setBanForm(null);
      setBanReason('');
      loadReports();
      loadBans();
    }
    setActionLoading('');
  }

  async function banUserDirect(userId: string) {
    if (!directBanReason.trim()) return;
    setActionLoading(userId);
    const res = await fetch('/api/admin/bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, banType: 'temporary', reason: directBanReason, duration: directBanDuration }),
    });
    const data = await res.json();
    if (data.ok) {
      setDirectBanAgent(null);
      setDirectBanReason('');
      setAgents((prev) => prev.map((a) => a.id === userId ? { ...a, is_banned: true, is_online: false } : a));
    }
    setActionLoading('');
  }

  async function unbanUser(banId: string) {
    if (!unbanReason.trim()) return;
    setActionLoading(banId);
    const res = await fetch('/api/admin/bans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banId, reason: unbanReason }),
    });
    const data = await res.json();
    if (data.ok) {
      setBans((prev) => prev.filter((b) => b.id !== banId));
      setUnbanningId(null);
      setUnbanReason('');
    }
    setActionLoading('');
  }

  async function reviewAppeal(appealId: string, approve: boolean) {
    if (!appealResponse.trim()) return;
    setActionLoading(appealId);
    const res = await fetch('/api/admin/appeals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appealId, decision: approve ? 'approved' : 'denied', adminResponse: appealResponse }),
    });
    const data = await res.json();
    if (data.ok) {
      setAppeals((prev) => prev.filter((a) => a.id !== appealId));
      setReviewingAppeal(null);
      setAppealResponse('');
      if (approve) loadBans();
    }
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
        <div className="flex-row" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(['orders', 'agents', 'payouts', 'reports', 'moderation', 'health'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${activeTab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'orders' ? `Orders (${orders.length})` :
               t === 'agents' ? `Dashers (${agents.length})` :
               t === 'payouts' ? `Payouts (${payouts.length})` :
               t === 'reports' ? 'Reports' :
               t === 'moderation' ? 'Moderation' : 'Health'}
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
                  {/* Direct Ban from agents tab */}
                  {directBanAgent === agent.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-end' }}>
                      <input
                        className="inp"
                        style={{ fontSize: '0.6rem', padding: '0.25em 0.4em', width: '12rem' }}
                        placeholder="Ban reason..."
                        value={directBanReason}
                        onChange={(e) => setDirectBanReason(e.target.value)}
                      />
                      <select
                        className="inp"
                        style={{ fontSize: '0.58rem', padding: '0.2em 0.4em', width: '12rem' }}
                        value={directBanDuration}
                        onChange={(e) => setDirectBanDuration(e.target.value)}
                      >
                        <option value="7d">7 days</option>
                        <option value="14d">14 days</option>
                        <option value="30d">30 days</option>
                        <option value="permanent">Permanent</option>
                      </select>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setDirectBanAgent(null); setDirectBanReason(''); }}>Cancel</button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => banUserDirect(agent.id)}
                          disabled={!directBanReason || actionLoading === agent.id}
                        >
                          {actionLoading === agent.id ? <span className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> : 'Confirm Ban'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ fontSize: '0.58rem', opacity: 0.7 }}
                      onClick={() => { setDirectBanAgent(agent.id); setStrikingAgent(null); }}
                    >
                      Ban User
                    </button>
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
                      Approve
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

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reports.length === 0 ? (
              <div className="notice notice-g">No reports found ✓</div>
            ) : reports.map((report) => (
              <div key={report.id} className="agent-card" style={{ flexDirection: 'column', gap: '0.8rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div className="type-label" style={{ fontSize: '0.6rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                      {report.reporter?.name || '?'} → {report.reported?.name || '?'}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {report.reason.replace('_', ' ')}
                    </div>
                    {report.notes && <div style={{ fontSize: '0.62rem', color: '#ccc', marginTop: '0.2rem', maxWidth: '28rem' }}>{report.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    <span className={`badge ${
                      report.status === 'pending' ? 'badge-y' :
                      report.status === 'reviewing' ? 'badge-b' :
                      report.status === 'resolved' ? 'badge-gf' : 'badge-mut'
                    }`} style={{ fontSize: '0.5rem' }}>{report.status}</span>
                    {report.severity && <span className={`badge ${
                      report.severity === 'critical' ? 'badge-r' :
                      report.severity === 'high' ? 'badge-o' :
                      report.severity === 'medium' ? 'badge-y' : 'badge-mut'
                    }`} style={{ fontSize: '0.5rem' }}>{report.severity}</span>}
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.52rem', color: 'var(--muted)' }}>
                      {format(parseISO(report.created_at), 'd MMM HH:mm')}
                    </div>
                  </div>
                </div>

                {report.admin_notes && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--yellow)', borderLeft: '0.1rem solid var(--yellow)', paddingLeft: '0.6rem' }}>
                    Note: {report.admin_notes}
                  </div>
                )}

                {/* Actions */}
                {!['resolved', 'dismissed'].includes(report.status) && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => updateReport(report.id, { status: 'reviewing' })} disabled={actionLoading === report.id}>Review</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => updateReport(report.id, { status: 'resolved' })} disabled={actionLoading === report.id}>Resolve</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => updateReport(report.id, { status: 'dismissed' })} disabled={actionLoading === report.id}>Dismiss</button>
                    <select
                      className="inp"
                      style={{ fontSize: '0.58rem', padding: '0.2em 0.4em', height: 'auto' }}
                      defaultValue=""
                      onChange={(e) => e.target.value && updateReport(report.id, { severity: e.target.value })}
                    >
                      <option value="">Set severity…</option>
                      {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {report.reported?.id && banForm?.reportId !== report.id ? (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setBanForm({ userId: report.reported!.id, reportId: report.id })}
                      >Ban User</button>
                    ) : banForm?.reportId === report.id && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        <input className="inp" style={{ fontSize: '0.6rem', padding: '0.2em 0.4em' }} placeholder="Reason" value={banReason} onChange={e => setBanReason(e.target.value)} />
                        <select className="inp" style={{ fontSize: '0.58rem', padding: '0.2em 0.4em' }} value={banDuration} onChange={e => setBanDuration(e.target.value)}>
                          <option value="7d">7 days</option><option value="14d">14 days</option><option value="30d">30 days</option><option value="90d">90 days</option>
                        </select>
                        <button className="btn btn-sm btn-danger" onClick={() => banUser(banForm!.userId, report.id)} disabled={!banReason || actionLoading === banForm!.userId}>Confirm Ban</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setBanForm(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {editingNotes === report.id ? (
                  <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                    <input className="inp" style={{ flex: 1, fontSize: '0.62rem' }} placeholder="Admin note…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} />
                    <button className="btn btn-sm btn-primary" onClick={() => { updateReport(report.id, { adminNotes }); setEditingNotes(null); setAdminNotes(''); }}>Save</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setEditingNotes(null)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-ghost" style={{ fontSize: '0.58rem' }} onClick={() => { setEditingNotes(report.id); setAdminNotes(report.admin_notes || ''); }}>+ Admin Note</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MODERATION TAB */}
        {activeTab === 'moderation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Active Bans */}
            <div>
              <div className="sec-label" style={{ marginBottom: '1rem' }}>Active Bans ({bans.length})</div>
              {bans.length === 0 ? (
                <div className="notice notice-g">No active bans ✓</div>
              ) : bans.map((ban) => (
                <div key={ban.id} className="agent-card" style={{ marginBottom: '0.6rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', fontWeight: 600 }}>{ban.user?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{ban.user?.email}</div>
                      <div style={{ fontSize: '0.62rem', color: '#ccc', marginTop: '0.2rem' }}><strong>Reason:</strong> {ban.reason}</div>
                      {ban.expires_at && <div style={{ fontSize: '0.58rem', color: 'var(--yellow)' }}>Expires: {format(parseISO(ban.expires_at), 'd MMM yyyy')}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="badge badge-r" style={{ fontSize: '0.5rem' }}>{ban.ban_type}</span>
                    </div>
                  </div>
                  {unbanningId === ban.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input className="inp" style={{ fontSize: '0.62rem', flex: 1 }} placeholder="Unban reason" value={unbanReason} onChange={e => setUnbanReason(e.target.value)} />
                      <button className="btn btn-sm btn-primary" onClick={() => unbanUser(ban.id)} disabled={!unbanReason || actionLoading === ban.id}>Confirm</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setUnbanningId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-sm btn-ghost" onClick={() => setUnbanningId(ban.id)}>Unban</button>
                  )}
                </div>
              ))}
            </div>

            {/* Pending Appeals */}
            <div>
              <div className="sec-label" style={{ marginBottom: '1rem' }}>Pending Appeals ({appeals.length})</div>
              {appeals.length === 0 ? (
                <div className="notice notice-g">No pending appeals ✓</div>
              ) : appeals.map((appeal) => (
                <div key={appeal.id} className="agent-card" style={{ marginBottom: '0.6rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.62rem', color: '#ccc', lineHeight: 1.5 }}>{appeal.appeal_text}</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--muted)' }}>{format(parseISO(appeal.created_at), 'd MMM HH:mm')}</div>
                  {reviewingAppeal === appeal.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                      <input className="inp" style={{ fontSize: '0.62rem' }} placeholder="Response to user" value={appealResponse} onChange={e => setAppealResponse(e.target.value)} />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => reviewAppeal(appeal.id, true)} disabled={!appealResponse}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => reviewAppeal(appeal.id, false)} disabled={!appealResponse}>Deny</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => setReviewingAppeal(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-sm btn-ghost" onClick={() => setReviewingAppeal(appeal.id)}>Review</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={loadHealth} style={{ alignSelf: 'flex-end' }}>↻ Refresh</button>
            {!health ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
            ) : (
              <>
                <div className="grid-3">
                  <div className="stat-card"><div className="sc-val">{health.orders.last24h}</div><div className="sc-lbl">Orders (24h)</div></div>
                  <div className="stat-card"><div className="sc-val">{health.orders.lastHour}</div><div className="sc-lbl">Orders (1h)</div></div>
                  <div className="stat-card"><div className="sc-val">{health.users.onlineNow}</div><div className="sc-lbl">Online Now</div></div>
                </div>
                <div className="grid-3">
                  <div className="stat-card"><div className="sc-val">{health.emails.sentLast24h}</div><div className="sc-lbl">Emails Sent (24h)</div></div>
                  <div className="stat-card"><div className="sc-val">{health.emails.deliveryRate}%</div><div className="sc-lbl">Delivery Rate</div></div>
                  <div className="stat-card"><div className="sc-val" style={{ color: health.emails.failedLast24h > 0 ? 'var(--danger)' : 'var(--green)' }}>{health.emails.failedLast24h}</div><div className="sc-lbl">Failed (24h)</div></div>
                </div>
                <div className="grid-3">
                  <div className="stat-card"><div className="sc-val" style={{ color: health.moderation.pendingReports > 0 ? 'var(--yellow)' : undefined }}>{health.moderation.pendingReports}</div><div className="sc-lbl">Pending Reports</div></div>
                  <div className="stat-card"><div className="sc-val" style={{ color: health.moderation.activeBans > 0 ? 'var(--danger)' : undefined }}>{health.moderation.activeBans}</div><div className="sc-lbl">Active Bans</div></div>
                  <div className="stat-card"><div className="sc-val" style={{ color: health.moderation.pendingAppeals > 0 ? 'var(--yellow)' : undefined }}>{health.moderation.pendingAppeals}</div><div className="sc-lbl">Pending Appeals</div></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
