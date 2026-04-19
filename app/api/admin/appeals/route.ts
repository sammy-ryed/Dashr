import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { requireAdmin, logModerationAction, isValidUUID, sanitizeText } from '@/lib/moderation';
import type { AppealStatus } from '@/types';

const VALID_STATUSES = new Set<AppealStatus>(['pending', 'reviewing', 'approved', 'denied']);

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;

  let query = admin
    .from('appeals')
    .select(`
      *,
      user:user_id(id, name, email),
      ban:ban_id(id, ban_type, reason, expires_at)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status && VALID_STATUSES.has(status as AppealStatus)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return apiError('Failed to fetch appeals', 500);

  return apiSuccess({ appeals: data || [] });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const body = await request.json();
  const appealId = body.appealId;
  // Accept either 'decision' (from admin UI) or 'status' (direct API calls)
  const rawStatus = (body.decision || body.status) as string;
  // Map decision values to valid status values
  const statusMap: Record<string, AppealStatus> = {
    approved: 'approved',
    denied: 'denied',
    reviewing: 'reviewing',
    pending: 'pending',
  };
  const status = statusMap[rawStatus] as AppealStatus | undefined;
  const adminResponse = sanitizeText(body.adminResponse || '', 1000);

  if (!isValidUUID(appealId)) return apiError('Invalid appeal ID', 400);
  if (!status || !VALID_STATUSES.has(status)) return apiError('Invalid status/decision', 400);

  // Fetch appeal
  const { data: appeal } = await admin
    .from('appeals')
    .select('id, ban_id, user_id, status')
    .eq('id', appealId)
    .single();

  if (!appeal) return apiError('Appeal not found', 404);

  // Update appeal
  const update: Record<string, unknown> = {
    status,
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  };
  if (adminResponse) update.admin_response = adminResponse;

  await admin.from('appeals').update(update).eq('id', appealId);

  // If approved, unban the user
  if (status === 'approved') {
    await admin
      .from('bans')
      .update({
        is_active: false,
        unbanned_by: adminId,
        unbanned_at: new Date().toISOString(),
        unban_reason: `Appeal approved: ${adminResponse || 'No reason given'}`,
      })
      .eq('id', appeal.ban_id);

    // Check for other active bans
    const { count: otherBans } = await admin
      .from('bans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', appeal.user_id)
      .eq('is_active', true);

    if (!otherBans || otherBans === 0) {
      await admin
        .from('users')
        .update({ is_banned: false, ban_reason: null })
        .eq('id', appeal.user_id);
    }

    await logModerationAction(admin, {
      adminId,
      action: 'approve_appeal',
      targetUserId: appeal.user_id,
      targetEntityId: appealId,
      details: { adminResponse },
    });
  } else if (status === 'denied') {
    await logModerationAction(admin, {
      adminId,
      action: 'deny_appeal',
      targetUserId: appeal.user_id,
      targetEntityId: appealId,
      details: { adminResponse },
    });
  }

  return apiSuccess({ updated: true });
});
