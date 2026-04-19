import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { requireAdmin, logModerationAction, isValidUUID, sanitizeText } from '@/lib/moderation';
import type { ReportStatus, ReportSeverity } from '@/types';

const VALID_STATUSES = new Set<ReportStatus>(['pending', 'reviewing', 'resolved', 'dismissed']);
const VALID_SEVERITIES = new Set<ReportSeverity>(['low', 'medium', 'high', 'critical']);

export const GET = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  let query = admin
    .from('reports')
    .select(`
      *,
      reporter:reporter_id(id, name, email),
      reported:reported_id(id, name, email, role)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status && VALID_STATUSES.has(status as ReportStatus)) {
    query = query.eq('status', status);
  }
  if (severity && VALID_SEVERITIES.has(severity as ReportSeverity)) {
    query = query.eq('severity', severity);
  }

  const { data, error } = await query;
  if (error) return apiError('Failed to fetch reports', 500);

  return apiSuccess({ reports: data || [] });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const authClient = await createClient();
  const admin = await createAdminClient();
  const adminId = await requireAdmin(admin, authClient);
  if (!adminId) return apiError('Admin access required', 403);

  const body = await request.json();
  const reportId = body.reportId;
  if (!isValidUUID(reportId)) return apiError('Invalid report ID', 400);

  // Build update object
  const update: Record<string, unknown> = {};

  if (body.status && VALID_STATUSES.has(body.status)) {
    update.status = body.status;
    if (body.status === 'resolved' || body.status === 'dismissed') {
      update.resolved_by = adminId;
      update.resolved_at = new Date().toISOString();
    }
  }

  if (body.severity && VALID_SEVERITIES.has(body.severity)) {
    update.severity = body.severity;
  }

  if (typeof body.adminNotes === 'string') {
    update.admin_notes = sanitizeText(body.adminNotes, 2000);
  }

  if (Object.keys(update).length === 0) {
    return apiError('No valid fields to update', 400);
  }

  const { data: report, error: fetchError } = await admin
    .from('reports')
    .select('id, reported_id, status')
    .eq('id', reportId)
    .single();

  if (fetchError || !report) return apiError('Report not found', 404);

  const { error: updateError } = await admin
    .from('reports')
    .update(update)
    .eq('id', reportId);

  if (updateError) return apiError('Failed to update report', 500);

  // Audit log
  const action = update.status === 'resolved'
    ? 'resolve_report'
    : update.status === 'dismissed'
      ? 'dismiss_report'
      : 'update_report_severity';

  await logModerationAction(admin, {
    adminId,
    action: action as 'resolve_report' | 'dismiss_report' | 'update_report_severity',
    targetUserId: report.reported_id,
    targetEntityId: reportId,
    details: { previousStatus: report.status, update },
  });

  return apiSuccess({ updated: true });
});
