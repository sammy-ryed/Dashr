import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';

export const POST = withErrorHandling(async () => {
  const authClient = await createClient();
  const user = await getUserSafe(authClient);
  if (!user) return apiError('Unauthorized', 401);

  const admin = await createAdminClient();

  // 1. Cancel any pending/assigned orders (so dashers aren't left hanging)
  await admin
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('customer_id', user.id)
    .in('status', ['pending', 'assigned']);

  // 2. If user is a dasher, take them offline
  await admin.from('users').update({ is_online: false, pending_agent: false }).eq('id', user.id);

  // 3. Hard-delete the user row (cascades via FK to orders, messages, notifications etc.)
  const { error: deleteError } = await admin.from('users').delete().eq('id', user.id);
  if (deleteError) return apiError('Failed to delete profile: ' + deleteError.message, 500);

  // 4. Delete the auth user (removes login credentials completely)
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    // Non-fatal: profile row is already gone; auth cleanup will happen via orphan job
    console.error('Auth user deletion failed (non-fatal):', authError.message);
  }

  return apiSuccess({ ok: true });
});
