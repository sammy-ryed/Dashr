import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import crypto from 'crypto';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Auth check — must be logged in
  const authClient = await createClient();
  const sessionUser = await getUserSafe(authClient);
  if (!sessionUser) {
    return apiError('Unauthorized', 401);
  }

  const { userId, srmId, idCardUrl, expectedName } = await request.json();

  if (!userId || !srmId || !idCardUrl || !expectedName) {
    return apiError('Missing required fields', 400);
  }

  // Ensure the userId in the request matches the authenticated user
  if (userId !== sessionUser.id) {
    return apiError('Forbidden', 403);
  }

  // Input length guards
  if (typeof srmId !== 'string' || srmId.length > 50) {
    return apiError('Invalid SRM ID', 400);
  }
  if (typeof expectedName !== 'string' || expectedName.length > 100) {
    return apiError('Name too long', 400);
  }
  if (typeof idCardUrl !== 'string' || idCardUrl.length > 1000) {
    return apiError('Invalid ID card URL', 400);
  }

  // Validate idCardUrl is a proper Supabase storage URL (prevent SSRF)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!idCardUrl.startsWith(SUPABASE_URL)) {
    return apiError('Invalid ID card URL', 400);
  }

  const supabase = await createAdminClient();

  // Check if SRM ID hash is blocked
  const srmIdHash = crypto.createHash('sha256').update(srmId).digest('hex');
  const { data: existingBlocked } = await supabase
    .from('users')
    .select('id')
    .eq('blocked_id_hash', srmIdHash)
    .single();

  if (existingBlocked) {
    return apiError(
      'This SRM ID has been permanently blocked from DASHR due to policy violations.',
      403,
    );
  }

  // Manual-review mode: OCR is intentionally bypassed.
  void expectedName;

  return apiSuccess({ message: 'ID submitted for admin review' });
});
