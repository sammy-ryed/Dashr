import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { requireAdmin } from '@/lib/moderation';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // Parallel health queries
  const [
    ordersToday,
    ordersLastHour,
    activeUsers,
    emailSent,
    emailFailed,
    pendingReports,
    activeBans,
    pendingAppeals,
  ] = await Promise.all([
    // Orders in last 24h
    admin.from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo),

    // Orders in last 1h
    admin.from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo),

    // Users currently online
    admin.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('is_online', true),

    // Emails sent in last 24h (use status column, not a non-existent delivered column)
    admin.from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', oneDayAgo),

    // Emails failed in last 24h
    admin.from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', oneDayAgo),

    // Pending reports
    admin.from('reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'reviewing']),

    // Active bans
    admin.from('bans')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Pending appeals
    admin.from('appeals')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'reviewing']),
  ]);

  const sentCount = emailSent.count || 0;
  const failedCount = emailFailed.count || 0;
  const deliveredCount = sentCount; // sent = successfully handed to provider

  return apiSuccess({
    timestamp: now.toISOString(),
    orders: {
      last24h: ordersToday.count || 0,
      lastHour: ordersLastHour.count || 0,
    },
    users: {
      onlineNow: activeUsers.count || 0,
    },
    emails: {
      sentLast24h: sentCount,
      deliveredLast24h: deliveredCount,
      failedLast24h: failedCount,
      deliveryRate: sentCount > 0
        ? Math.round((deliveredCount / (sentCount + failedCount)) * 100)
        : 100,
    },
    moderation: {
      pendingReports: pendingReports.count || 0,
      activeBans: activeBans.count || 0,
      pendingAppeals: pendingAppeals.count || 0,
    },
  });
});
