import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { requireAdmin } from '@/lib/moderation';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || 100), 200);
  const targetUserId = searchParams.get('userId') || undefined;

  let query = admin
    .from('moderation_audit_log')
    .select(`
      *,
      admin:admin_id(id, name),
      target_user:target_user_id(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (targetUserId) {
    query = query.eq('target_user_id', targetUserId);
  }

  const { data, error } = await query;
  if (error) return apiError('Failed to fetch audit log', 500);

  return apiSuccess({ entries: data || [] });
});
