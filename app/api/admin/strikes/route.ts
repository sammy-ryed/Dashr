import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { STRIKES_TO_OFFBOARD } from '@/lib/constants';
import { requireAdmin, logModerationAction, isValidUUID } from '@/lib/moderation';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import crypto from 'crypto';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { agentId, reason, orderId } = await request.json();

  if (!agentId || !isValidUUID(agentId)) {
    return apiError('Valid agentId is required', 400);
  }
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return apiError('reason is required', 400);
  }

  const authClient = await createClient();
  const supabase = await createAdminClient();

  // Verify admin
  const adminId = await requireAdmin(supabase, authClient);
  if (!adminId) {
    return apiError('Admin access required', 403);
  }

  // Insert strike
  await supabase.from('strikes').insert({ agent_id: agentId, order_id: orderId || null, reason: reason.trim() });

  // Get current agent data
  const { data: agent } = await supabase.from('users').select('strikes, srm_id, name').eq('id', agentId).single();
  if (!agent) return apiError('Agent not found', 404);

  const prevStrikes = agent.strikes || 0;
  const newStrikes = prevStrikes + 1;
  let offboarded = false;

  if (newStrikes >= STRIKES_TO_OFFBOARD) {
    // Offboard agent — hash their SRM ID to block re-registration
    const blockedIdHash = agent.srm_id ? crypto.createHash('sha256').update(agent.srm_id).digest('hex') : null;
    await supabase.from('users').update({
      strikes: newStrikes,
      is_verified: false,
      is_online: false,
      blocked_id_hash: blockedIdHash,
    }).eq('id', agentId);
    offboarded = true;
  } else {
    await supabase.from('users').update({ strikes: newStrikes }).eq('id', agentId);
  }

  // Audit log
  await logModerationAction(supabase, {
    adminId,
    action: 'add_strike',
    targetUserId: agentId,
    targetEntityId: orderId || undefined,
    details: {
      reason,
      strikes_before: prevStrikes,
      strikes_after: newStrikes,
      offboarded,
    },
  });

  return apiSuccess({ newStrikes, offboarded });
});
