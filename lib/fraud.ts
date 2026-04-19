/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Fraud Controls
 * ═══════════════════════════════════════════════════════════════
 * Detects and prevents abusive patterns:
 *  - Cancel abuse: 3+ cancels in 24h → 2h order cooldown
 *  - Rapid order creation: 5+ orders in 1h → cooldown
 *  - Report spam: 5+ reports in 7 days → auto-flag for admin review
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── In-memory cooldown store (survives hot reloads in dev, resets on deploy) ─

interface CooldownEntry {
  until: number; // epoch ms
  reason: string;
}

const cooldowns = new Map<string, CooldownEntry>();

function setCooldown(userId: string, durationMs: number, reason: string) {
  cooldowns.set(userId, { until: Date.now() + durationMs, reason });
}

export function getCooldown(userId: string): { active: boolean; reason: string; retryAfterMs: number } {
  const entry = cooldowns.get(userId);
  if (!entry) return { active: false, reason: '', retryAfterMs: 0 };

  if (Date.now() >= entry.until) {
    cooldowns.delete(userId);
    return { active: false, reason: '', retryAfterMs: 0 };
  }

  return {
    active: true,
    reason: entry.reason,
    retryAfterMs: entry.until - Date.now(),
  };
}

// ── Cancel Abuse Detection ─────────────────────────────────────

const CANCEL_ABUSE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const CANCEL_ABUSE_THRESHOLD = 3;
const CANCEL_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Check if a user is cancel-abusing. Call AFTER the cancel is committed.
 * If they hit the threshold, sets a 2h cooldown on order creation.
 */
export async function checkCancelAbuse(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const since = new Date(Date.now() - CANCEL_ABUSE_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .eq('status', 'cancelled')
    .gte('updated_at', since);

  if ((count || 0) >= CANCEL_ABUSE_THRESHOLD) {
    setCooldown(
      userId,
      CANCEL_COOLDOWN_MS,
      `You've cancelled ${CANCEL_ABUSE_THRESHOLD}+ orders in the last 24 hours. Wait 2 hours before placing a new order.`,
    );
  }
}

// ── Rapid Order Creation Detection ────────────────────────────

const RAPID_ORDER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RAPID_ORDER_THRESHOLD = 5;
const RAPID_ORDER_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if a user is creating orders too fast. Call BEFORE inserting.
 * Returns an error string if they should be blocked, null otherwise.
 */
export async function checkRapidOrderCreation(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  // First check in-memory cooldown
  const cooldown = getCooldown(userId);
  if (cooldown.active) return cooldown.reason;

  const since = new Date(Date.now() - RAPID_ORDER_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', userId)
    .gte('created_at', since);

  if ((count || 0) >= RAPID_ORDER_THRESHOLD) {
    const msg = `You're creating orders too quickly. Please wait 30 minutes.`;
    setCooldown(userId, RAPID_ORDER_COOLDOWN_MS, msg);
    return msg;
  }

  return null;
}

// ── Report Spam Detection ──────────────────────────────────────

const REPORT_SPAM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REPORT_SPAM_THRESHOLD = 5;

/**
 * Check if a reporter is filing too many reports.
 * If so, flag them for admin review (sets a note in their user record).
 * Returns true if they're flagged (you can choose to still allow the report).
 */
export async function checkReportSpam(
  supabase: SupabaseClient,
  reporterId: string,
): Promise<boolean> {
  const since = new Date(Date.now() - REPORT_SPAM_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', reporterId)
    .gte('created_at', since);

  if ((count || 0) >= REPORT_SPAM_THRESHOLD) {
    // Flag the user for admin review — non-blocking, fire and forget
    await supabase
      .from('users')
      .update({ ban_reason: '[SYSTEM] Flagged for excessive reports — admin review needed' })
      .eq('id', reporterId)
      .is('is_banned', false); // Don't overwrite ban reason if already banned

    return true; // flagged
  }

  return false;
}
