import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { getUserSafe } from '@/lib/auth';
import { checkUserBan, isValidUUID, sanitizeText, logModerationAction } from '@/lib/moderation';
import { reportLimiter } from '@/lib/rate-limit';
import type { ReportReason } from '@/types';

const VALID_REASONS = new Set<ReportReason>([
  'abuse', 'scam', 'fake_order', 'no_show',
  'harassment', 'payment_issue', 'other',
]);

export const POST = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const user = await getUserSafe(authClient);
  if (!user) return apiError('Unauthorized', 401);

  // Rate limit
  const rl = reportLimiter.check(user.id);
  if (!rl.allowed) {
    return apiError('Too many reports. Try again later.', 429);
  }

  const body = await request.json();
  const reportedId = body.reportedId?.trim() || '';
  const orderId = body.orderId?.trim() || null;
  const reason = body.reason as ReportReason;
  const notes = sanitizeText(body.notes || '', 1000);
  const evidenceUrls: string[] = Array.isArray(body.evidenceUrls)
    ? body.evidenceUrls.filter((u: unknown) => typeof u === 'string').slice(0, 3)
    : [];

  // Validate
  if (!isValidUUID(reportedId)) return apiError('Invalid reported user', 400);
  if (!VALID_REASONS.has(reason)) return apiError('Invalid report reason', 400);
  if (reportedId === user.id) return apiError('You cannot report yourself', 400);

  const admin = await createAdminClient();

  // Check reporter isn't banned
  const banCheck = await checkUserBan(admin, user.id);
  if (banCheck.isBanned) return apiError('Your account is suspended', 403);

  // Verify reported user exists
  const { data: reported } = await admin
    .from('users')
    .select('id')
    .eq('id', reportedId)
    .single();
  if (!reported) return apiError('Reported user not found', 404);

  // If order provided, verify both users are involved
  if (orderId) {
    if (!isValidUUID(orderId)) return apiError('Invalid order ID', 400);
    const { data: order } = await admin
      .from('orders')
      .select('customer_id, agent_id')
      .eq('id', orderId)
      .single();

    if (!order) return apiError('Order not found', 404);

    const involved = [order.customer_id, order.agent_id].filter(Boolean);
    if (!involved.includes(user.id) || !involved.includes(reportedId)) {
      return apiError('Both users must be part of the order', 400);
    }
  }

  // Check for recent duplicate reports
  const { count: recentCount } = await admin
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', user.id)
    .eq('reported_id', reportedId)
    .in('status', ['pending', 'reviewing'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if ((recentCount || 0) > 0) {
    return apiError('You already have a pending report for this user', 409);
  }

  // Insert report
  const { data: inserted, error: insertError } = await admin
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_id: reportedId,
      order_id: orderId,
      reason,
      notes,
      evidence_urls: evidenceUrls,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return apiError('Failed to submit report', 500);
  }

  return apiSuccess({ reportId: inserted.id }, 201);
});
