import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { requireAdmin, logModerationAction, isValidUUID, sanitizeText } from '@/lib/moderation';
import type { BanType } from '@/types';

const VALID_BAN_TYPES = new Set<BanType>(['temporary', 'permanent']);

// Default durations in days
const BAN_DURATIONS: Record<string, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') !== 'false';

  let query = admin
    .from('bans')
    .select(`
      *,
      user:user_id(id, name, email, role),
      admin:banned_by(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) return apiError('Failed to fetch bans', 500);

  return apiSuccess({ bans: data || [] });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const body = await request.json();
  const userId = body.userId;
  const banType = body.banType as BanType;
  const reason = sanitizeText(body.reason || '', 500);
  const duration = body.duration || '7d'; // default
  const relatedReportId = body.relatedReportId || null;

  if (!isValidUUID(userId)) return apiError('Invalid user ID', 400);
  if (!VALID_BAN_TYPES.has(banType)) return apiError('Invalid ban type', 400);
  if (!reason) return apiError('Ban reason is required', 400);
  if (userId === adminId) return apiError('You cannot ban yourself', 400);

  // Check user exists and isn't already banned
  const { data: targetUser } = await admin
    .from('users')
    .select('id, role, is_banned, name')
    .eq('id', userId)
    .single();

  if (!targetUser) return apiError('User not found', 404);
  if (targetUser.role === 'admin') return apiError('Cannot ban an admin', 403);

  // Check for existing active ban
  const { count: activeBans } = await admin
    .from('bans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if ((activeBans || 0) > 0) {
    return apiError('User already has an active ban', 409);
  }

  // Calculate expiration
  let expiresAt: string | null = null;
  if (banType === 'temporary') {
    const days = BAN_DURATIONS[duration] || 7;
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  // Create ban
  const { data: ban, error: banError } = await admin
    .from('bans')
    .insert({
      user_id: userId,
      banned_by: adminId,
      ban_type: banType,
      reason,
      related_report_id: relatedReportId,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true,
    })
    .select('id')
    .single();

  if (banError || !ban) return apiError('Failed to create ban', 500);

  // Update user's ban status
  await admin
    .from('users')
    .update({
      is_banned: true,
      ban_reason: reason,
      is_online: false, // Force offline
    })
    .eq('id', userId);

  // Audit log
  await logModerationAction(admin, {
    adminId,
    action: 'ban_user',
    targetUserId: userId,
    targetEntityId: ban.id,
    details: {
      banType,
      reason,
      expiresAt,
      userName: targetUser.name,
    },
  });

  return apiSuccess({ banId: ban.id }, 201);
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const body = await request.json();
  const banId = body.banId;
  const unbanReason = sanitizeText(body.reason || '', 500);

  if (!isValidUUID(banId)) return apiError('Invalid ban ID', 400);
  if (!unbanReason) return apiError('Unban reason is required', 400);

  // Fetch ban
  const { data: ban } = await admin
    .from('bans')
    .select('id, user_id, is_active')
    .eq('id', banId)
    .single();

  if (!ban) return apiError('Ban not found', 404);
  if (!ban.is_active) return apiError('Ban is already inactive', 400);

  // Deactivate the ban
  await admin
    .from('bans')
    .update({
      is_active: false,
      unbanned_by: adminId,
      unbanned_at: new Date().toISOString(),
      unban_reason: unbanReason,
    })
    .eq('id', banId);

  // Check for other active bans
  const { count: otherBans } = await admin
    .from('bans')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ban.user_id)
    .eq('is_active', true)
    .neq('id', banId);

  if (!otherBans || otherBans === 0) {
    await admin
      .from('users')
      .update({ is_banned: false, ban_reason: null })
      .eq('id', ban.user_id);
  }

  // Audit log
  await logModerationAction(admin, {
    adminId,
    action: 'unban_user',
    targetUserId: ban.user_id,
    targetEntityId: banId,
    details: { unbanReason },
  });

  return apiSuccess({ unbanned: true });
});
