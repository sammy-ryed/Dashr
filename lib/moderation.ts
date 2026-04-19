/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Moderation Helpers
 * ═══════════════════════════════════════════════════════════════
 * Shared utilities for ban checks, audit logging, and admin auth.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ── Ban Check ─────────────────────────────────────────────────

export interface BanCheckResult {
  isBanned: boolean;
  reason: string | null;
  expiresAt: string | null;
  banId: string | null;
}

/**
 * Check if a user is currently banned.
 * First checks the fast `is_banned` column, then verifies against the bans table
 * to handle expired temporary bans.
 */
export async function checkUserBan(
  supabase: SupabaseClient,
  userId: string,
): Promise<BanCheckResult> {
  // Quick check on user record
  const { data: user } = await supabase
    .from('users')
    .select('is_banned, ban_reason')
    .eq('id', userId)
    .single();

  if (!user?.is_banned) {
    return { isBanned: false, reason: null, expiresAt: null, banId: null };
  }

  // Verify there's actually an active ban (handles expired temp bans)
  const { data: activeBan } = await supabase
    .from('bans')
    .select('id, reason, expires_at, ban_type')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!activeBan) {
    // User is marked banned but no active ban exists — cleanup
    await supabase
      .from('users')
      .update({ is_banned: false, ban_reason: null })
      .eq('id', userId);

    return { isBanned: false, reason: null, expiresAt: null, banId: null };
  }

  // Check if temporary ban has expired
  if (activeBan.ban_type === 'temporary' && activeBan.expires_at) {
    if (new Date(activeBan.expires_at) <= new Date()) {
      // Expired — clean up
      await supabase
        .from('bans')
        .update({ is_active: false })
        .eq('id', activeBan.id);

      // Check if there are other active bans
      const { count } = await supabase
        .from('bans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!count || count === 0) {
        await supabase
          .from('users')
          .update({ is_banned: false, ban_reason: null })
          .eq('id', userId);
      }

      return { isBanned: false, reason: null, expiresAt: null, banId: null };
    }
  }

  return {
    isBanned: true,
    reason: activeBan.reason,
    expiresAt: activeBan.expires_at,
    banId: activeBan.id,
  };
}

// ── Audit Logging ─────────────────────────────────────────────

export type ModerationAction =
  | 'ban_user'
  | 'unban_user'
  | 'resolve_report'
  | 'dismiss_report'
  | 'update_report_severity'
  | 'approve_appeal'
  | 'deny_appeal'
  | 'add_strike'
  | 'remove_strike'
  | 'verify_agent'
  | 'unverify_agent';

export async function logModerationAction(
  supabase: SupabaseClient,
  params: {
    adminId: string;
    action: ModerationAction;
    targetUserId?: string;
    targetEntityId?: string;
    details?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from('moderation_audit_log').insert({
      admin_id: params.adminId,
      action: params.action,
      target_user_id: params.targetUserId || null,
      target_entity_id: params.targetEntityId || null,
      details: params.details || {},
    });
  } catch (err) {
    console.error('[audit] Failed to log moderation action:', err);
  }
}

// ── Admin Auth Helper ─────────────────────────────────────────

/**
 * Verify that the current request is from an admin user.
 * Uses service role client to bypass RLS.
 * Returns the admin user ID or null.
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  authClient: SupabaseClient,
): Promise<string | null> {
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return profile.id;
}

// ── Input Validation ──────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function sanitizeText(text: string, maxLength: number): string {
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[^\S ]/g, ' ') // Collapse non-space whitespace
    .trim()
    .slice(0, maxLength);
}
