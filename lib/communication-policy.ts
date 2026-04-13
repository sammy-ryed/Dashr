import { EMAIL_CONFIG } from '@/lib/config';
import { sendEmail } from '@/lib/email';
import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailEventType =
  | 'otp'
  | 'order_accepted_customer'
  | 'order_delivered_customer'
  | 'order_opportunity_dasher';

type LogStatus = 'sent' | 'failed' | 'skipped_quota' | 'skipped_policy';

type AdminClient = SupabaseClient;

export interface TrackedEmailInput {
  eventType: EmailEventType;
  to: string;
  subject: string;
  html: string;
  text?: string;
  orderId?: string;
  priority?: 'critical' | 'normal';
}

function startOfUtcDayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function cooldownStartIso(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

async function logEmailEvent(
  admin: AdminClient,
  params: {
    eventType: EmailEventType;
    recipientEmail: string;
    orderId?: string;
    status: LogStatus;
    providerMessageId?: string;
    error?: string;
  },
) {
  try {
    await admin.from('email_logs').insert({
      event_type: params.eventType,
      recipient_email: params.recipientEmail,
      order_id: params.orderId || null,
      status: params.status,
      provider: 'brevo',
      provider_message_id: params.providerMessageId || null,
      error: params.error || null,
    });
  } catch (err) {
    console.error('[email-log] Failed to persist email log:', err);
  }
}

async function getSentCountToday(admin: AdminClient): Promise<number> {
  const { count, error } = await admin
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('created_at', startOfUtcDayIso());

  if (error) {
    console.error('[email-budget] Failed to read daily usage:', error);
    return 0;
  }

  return count || 0;
}

async function hasRecentOpportunityEmail(admin: AdminClient, recipientEmail: string) {
  const { count, error } = await admin
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'order_opportunity_dasher')
    .eq('recipient_email', recipientEmail)
    .eq('status', 'sent')
    .gte('created_at', cooldownStartIso(EMAIL_CONFIG.dasherOpportunityCooldownMinutes));

  if (error) {
    console.error('[email-policy] Failed to read opportunity cooldown:', error);
    return false;
  }

  return (count || 0) > 0;
}

export function shouldSendDasherOpportunityEmail(commissionAmount: number) {
  return commissionAmount >= EMAIL_CONFIG.dasherOpportunityMinCommission;
}

export async function sendTrackedEmail(admin: AdminClient, input: TrackedEmailInput) {
  const priority = input.priority || 'normal';

  if (priority !== 'critical') {
    const sentCountToday = await getSentCountToday(admin);
    if (sentCountToday >= EMAIL_CONFIG.dailySoftLimit) {
      await logEmailEvent(admin, {
        eventType: input.eventType,
        recipientEmail: input.to,
        orderId: input.orderId,
        status: 'skipped_quota',
        error: `Daily soft limit reached (${EMAIL_CONFIG.dailySoftLimit})`,
      });

      return { ok: false, skipped: true as const, reason: 'daily_quota' as const };
    }
  }

  if (input.eventType === 'order_opportunity_dasher') {
    const inCooldown = await hasRecentOpportunityEmail(admin, input.to);
    if (inCooldown) {
      await logEmailEvent(admin, {
        eventType: input.eventType,
        recipientEmail: input.to,
        orderId: input.orderId,
        status: 'skipped_policy',
        error: `Cooldown active (${EMAIL_CONFIG.dasherOpportunityCooldownMinutes} min)`,
      });

      return { ok: false, skipped: true as const, reason: 'cooldown' as const };
    }
  }

  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (!result.ok) {
    await logEmailEvent(admin, {
      eventType: input.eventType,
      recipientEmail: input.to,
      orderId: input.orderId,
      status: 'failed',
      error: result.error,
    });

    return { ok: false, skipped: false as const, reason: 'provider_error' as const };
  }

  await logEmailEvent(admin, {
    eventType: input.eventType,
    recipientEmail: input.to,
    orderId: input.orderId,
    status: 'sent',
    providerMessageId: result.providerMessageId,
  });

  return { ok: true, skipped: false as const };
}
