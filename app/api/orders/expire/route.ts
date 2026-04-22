import { createAdminClient } from '@/lib/supabase-server';
import { apiSuccess, apiError, withErrorHandling } from '@/lib/api-helpers';

// POST /api/orders/expire
// Marks all pending orders older than 8 hours as 'expired'.
// Call this from a Supabase Edge Function cron, or from a Vercel cron job:
//   { "schedule": "0 * * * *", "path": "/api/orders/expire" }
// Protected by a shared cron secret so only the scheduler can trigger it.

export const POST = withErrorHandling(async (req: Request) => {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return apiError('Unauthorized', 401);
  }

  const admin = await createAdminClient();

  // Expire all pending orders older than 8 hours
  const { data: expired, error } = await admin
    .from('orders')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
    .select('id');

  if (error) return apiError('Failed to expire orders: ' + error.message, 500);

  return apiSuccess({ expired: expired?.length ?? 0 });
});
