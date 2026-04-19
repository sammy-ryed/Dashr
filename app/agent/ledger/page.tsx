'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { getUserSafe } from '@/lib/auth';
import { format, parseISO } from 'date-fns';
import AgentShell from '@/components/AgentShell';
import type { LedgerEntry } from '@/types';

interface GroupedWeek {
  weekStart: string;
  entries: LedgerEntry[];
  total: number;
}

export default function AgentLedgerPage() {
  const supabase = createClient();

  const [ledger, setLedger] = useState<GroupedWeek[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await getUserSafe(supabase);
      if (!user) return;

      const { data: entries } = await supabase
        .from('ledger')
        .select('*, order:order_id(id, pickup_zone, payment_method, order_value)')
        .eq('agent_id', user.id)
        .order('week_start', { ascending: false })
        .order('created_at', { ascending: false });

      if (!entries) { setLoading(false); return; }

      const weeks: Record<string, LedgerEntry[]> = {};
      let total = 0;
      for (const e of entries as LedgerEntry[]) {
        if (!weeks[e.week_start]) weeks[e.week_start] = [];
        weeks[e.week_start].push(e);
        total += e.amount;
      }

      const grouped = Object.entries(weeks).map(([weekStart, items]) => ({
        weekStart,
        entries: items,
        total: items.reduce((sum, e) => sum + e.amount, 0),
      }));

      setLedger(grouped);
      setTotalEarnings(total);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AgentShell>
      <div className="dash-topbar">
        <div className="dash-title">Ledger</div>
        <span className="type-label">Earnings History</span>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {/* Header + total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="type-label" style={{ marginBottom: '0.3rem' }}>Total Earnings</div>
            <div className="sc-val" style={{ fontSize: 'clamp(2.5rem,5vw,3.5rem)' }}>₹{totalEarnings}</div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
          </div>
        ) : ledger.length === 0 ? (
          <div className="notice notice-y">No ledger entries yet. Complete deliveries to see earnings here.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Type</th>
                  <th>Zone</th>
                  <th>Product Price</th>
                  <th>Commission</th>
                  <th>Week</th>
                  <th>Status</th>
                </tr>
              </thead>
              {ledger.map((week) => (
                <tbody key={`week-${week.weekStart}`}>
                  <tr className="wk-row">
                    <td colSpan={7}>── Week of {format(parseISO(week.weekStart), 'd MMM yyyy')} · Total: ₹{week.total} ──</td>
                  </tr>
                  {week.entries.map((entry) => {
                    const order = entry.order;
                    return (
                      <tr key={entry.id}>
                        <td data-label="Order ID"><span className="type-mono" style={{ fontSize: '0.65rem' }}>#{(entry.order_id || '').slice(-4).toUpperCase()}</span></td>
                        <td data-label="Type"><span className={`badge ${entry.type === 'commission' ? 'badge-y' : 'badge-w'}`}>{entry.type}</span></td>
                        <td data-label="Zone">{order?.pickup_zone?.replace('_', ' ') || '—'}</td>
                        <td data-label="Product Price" className="amt">₹{order?.order_value || '—'}</td>
                        <td data-label="Commission" className="amt">₹{entry.amount}</td>
                        <td data-label="Week">{format(parseISO(week.weekStart), 'MMM d')}</td>
                        <td data-label="Status">
                          <span className="badge badge-gf">✓ Recorded</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
      </div>
    </AgentShell>
  );
}
