'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import type { LedgerEntry } from '@/types';

interface GroupedWeek {
  weekStart: string;
  entries: LedgerEntry[];
  total: number;
}

export default function AgentLedgerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ledger, setLedger] = useState<GroupedWeek[]>([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('users').select('name, role').eq('id', user.id).single();
      if (!profile || profile.role !== 'agent') { router.push('/order'); return; }
      setAgentName(profile.name || '');

      const { data: entries } = await supabase
        .from('ledger')
        .select('*, order:order_id(id, pickup_zone, payment_method)')
        .eq('agent_id', user.id)
        .order('week_start', { ascending: false })
        .order('created_at', { ascending: false });

      if (!entries) { setLoading(false); return; }

      // Group by week
      const weeks: Record<string, LedgerEntry[]> = {};
      let unpaid = 0;
      for (const e of entries as LedgerEntry[]) {
        if (!weeks[e.week_start]) weeks[e.week_start] = [];
        weeks[e.week_start].push(e);
        if (!e.is_paid) unpaid += e.amount;
      }

      const grouped = Object.entries(weeks).map(([weekStart, items]) => ({
        weekStart,
        entries: items,
        total: items.reduce((sum, e) => sum + e.amount, 0),
      }));

      setLedger(grouped);
      setTotalUnpaid(unpaid);
      setLoading(false);
    }
    load();
  }, []);

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
          <li><Link href="/agent/dashboard">Feed</Link></li>
          <li><Link href="/agent/active">Active</Link></li>
          <li><Link href="/agent/ledger" className="active">Ledger</Link></li>
        </ul>
      </nav>

      <div style={{ padding: '2rem clamp(1rem,5vw,4rem)', maxWidth: '64rem', margin: '0 auto' }}>
        {/* Header + total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="type-label" style={{ marginBottom: '0.3rem' }}>Total Unpaid</div>
            <div className="sc-val" style={{ fontSize: 'clamp(2.5rem,5vw,3.5rem)' }}>₹{totalUnpaid}</div>
          </div>
          <span className="type-label">Payout every Monday</span>
        </div>

        {ledger.length === 0 ? (
          <div className="notice notice-y">No ledger entries yet. Complete deliveries to see earnings here.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Type</th>
                  <th>Zone</th>
                  <th>Amount</th>
                  <th>Week</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((week) => (
                  <>
                    <tr className="wk-row" key={`week-${week.weekStart}`}>
                      <td colSpan={6}>── Week of {format(parseISO(week.weekStart), 'd MMM yyyy')} · Total: ₹{week.total} ──</td>
                    </tr>
                    {week.entries.map((entry) => {
                      const order = entry.order as any;
                      return (
                        <tr key={entry.id}>
                          <td><span className="type-mono" style={{ fontSize: '0.65rem' }}>#{(entry.order_id || '').slice(-4).toUpperCase()}</span></td>
                          <td><span className={`badge ${entry.type === 'commission' ? 'badge-y' : 'badge-w'}`}>{entry.type}</span></td>
                          <td>{order?.pickup_zone?.replace('_', ' ') || '—'}</td>
                          <td className="amt">₹{entry.amount}</td>
                          <td>{format(parseISO(week.weekStart), 'MMM d')}</td>
                          <td>
                            <span className={`badge ${entry.is_paid ? 'badge-gf' : 'badge-mut'}`}>
                              {entry.is_paid ? '✓ Paid' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
