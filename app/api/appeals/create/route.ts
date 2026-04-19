import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { getUserSafe } from '@/lib/auth';
import { isValidUUID, sanitizeText } from '@/lib/moderation';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const user = await getUserSafe(authClient);
  if (!user) return apiError('Unauthorized', 401);

  const body = await request.json();
  const banId = body.banId;
  const appealText = sanitizeText(body.appealText || '', 2000);

  if (!isValidUUID(banId)) return apiError('Invalid ban ID', 400);
  if (!appealText || appealText.length < 20) {
    return apiError('Please explain your appeal in at least 20 characters', 400);
  }

  const admin = await createAdminClient();

  // Verify ban exists and belongs to user
  const { data: ban } = await admin
    .from('bans')
    .select('id, user_id, is_active')
    .eq('id', banId)
    .eq('user_id', user.id)
    .single();

  if (!ban) return apiError('Ban not found', 404);
  if (!ban.is_active) return apiError('This ban is no longer active', 400);

  // Check for existing appeal
  const { count } = await admin
    .from('appeals')
    .select('id', { count: 'exact', head: true })
    .eq('ban_id', banId);

  if ((count || 0) > 0) {
    return apiError('You have already submitted an appeal for this ban', 409);
  }

  // Insert appeal
  const { data: appeal, error: insertError } = await admin
    .from('appeals')
    .insert({
      ban_id: banId,
      user_id: user.id,
      appeal_text: appealText,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !appeal) {
    return apiError('Failed to submit appeal', 500);
  }

  return apiSuccess({ appealId: appeal.id }, 201);
});
