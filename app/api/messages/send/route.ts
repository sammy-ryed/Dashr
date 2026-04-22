import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';

// ── Email templates ────────────────────────────────────────────

function firstMessageHtml({
  senderName,
  recipientName,
  messageSnippet,
  orderId,
}: {
  senderName: string;
  recipientName: string;
  messageSnippet: string;
  orderId: string;
}): string {
  const shortId = orderId.slice(-4).toUpperCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dashr.app';
  return `
    <div style="font-family: 'Courier New', monospace; background: #0f0f0f; color: #f0f0f0; padding: 2rem; max-width: 480px; margin: 0 auto;">
      <div style="border: 3px solid #e9b50b; padding: 2rem;">
        <div style="font-size: 2rem; font-weight: 900; color: #e9b50b; letter-spacing: 0.06em; margin-bottom: 0.5rem;">
          DASHR<sup style="font-size: 0.5rem; background: #e9b50b; color: #000; padding: 0.1em 0.4em; border: 2px solid #000; vertical-align: super; margin-left: 4px;">SRM</sup>
        </div>
        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 2rem;">
          New Message — ORDER_#${shortId}
        </div>
        <div style="font-size: 0.9rem; color: #ccc; margin-bottom: 1rem;">
          Hi <strong style="color: #f0f0f0;">${recipientName}</strong>,
        </div>
        <div style="font-size: 0.85rem; color: #ccc; margin-bottom: 1.5rem;">
          <strong style="color: #e9b50b;">${senderName}</strong> just sent you a message about your order:
        </div>
        <div style="background: #1a1a1a; border-left: 3px solid #e9b50b; padding: 1rem 1.2rem; margin-bottom: 1.5rem; font-style: italic; color: #ddd; font-size: 0.85rem;">
          "${messageSnippet}"
        </div>
        <a href="${appUrl}" style="display: inline-block; background: #e9b50b; color: #000; font-weight: 700; padding: 0.8rem 1.5rem; text-decoration: none; letter-spacing: 0.05em; font-size: 0.85rem;">
          OPEN DASHR →
        </a>
        <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #333; font-size: 0.65rem; color: #555; text-transform: uppercase; letter-spacing: 0.1em;">
          Built by SRM students. For SRM students.
        </div>
      </div>
    </div>
  `;
}

// POST /api/messages/send
export const POST = withErrorHandling(async (req: Request) => {
  const authClient = await createClient();
  const user = await getUserSafe(authClient);
  if (!user) return apiError('Unauthorized', 401);

  const body = await req.json();
  const { orderId, content } = body as { orderId?: string; content?: string };

  if (!orderId || typeof orderId !== 'string') return apiError('orderId required', 400);
  if (!content || typeof content !== 'string' || !content.trim()) return apiError('Message cannot be empty', 400);
  if (content.length > 500) return apiError('Message too long (max 500 chars)', 400);

  const admin = await createAdminClient();

  // Fetch order + participant profiles for first-message email
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_id, agent_id, status, first_msg_email_sent_to')
    .eq('id', orderId)
    .single();

  if (!order) return apiError('Order not found', 404);

  const isParticipant = order.customer_id === user.id || order.agent_id === user.id;
  if (!isParticipant) return apiError('You are not a participant in this order', 403);

  // Only allow messaging on active orders
  if (['delivered', 'cancelled', 'expired'].includes(order.status)) {
    return apiError('Cannot message on a completed order', 409);
  }

  const { data: msg, error } = await admin
    .from('messages')
    .insert({ order_id: orderId, sender_id: user.id, content: content.trim() })
    .select('id, created_at')
    .single();

  if (error) return apiError('Failed to send message: ' + error.message, 500);

  // ── First-message email notification ────────────────────────
  // Determine who the recipient is (the OTHER party)
  const recipientId = user.id === order.customer_id ? order.agent_id : order.customer_id;

  // Only send if we have a recipient and they haven't received a first-message email yet
  const alreadySent: string[] = order.first_msg_email_sent_to ?? [];
  const shouldSendEmail = recipientId && !alreadySent.includes(recipientId);

  if (shouldSendEmail) {
    try {
      // Fetch sender and recipient profiles
      const { data: profiles } = await admin
        .from('users')
        .select('id, name, email')
        .in('id', [user.id, recipientId]);

      const sender = (profiles ?? []).find((p: { id: string }) => p.id === user.id) as { id: string; name: string; email: string } | undefined;
      const recipient = (profiles ?? []).find((p: { id: string }) => p.id === recipientId) as { id: string; name: string; email: string } | undefined;

      if (sender && recipient?.email) {
        // Fire-and-forget — don't block the message send on email delivery
        sendEmail({
          to: recipient.email,
          subject: `💬 ${sender.name} messaged you — ORDER_#${orderId.slice(-4).toUpperCase()}`,
          html: firstMessageHtml({
            senderName: sender.name || 'Your Dasher',
            recipientName: recipient.name || 'there',
            messageSnippet: content.trim().slice(0, 120),
            orderId,
          }),
          text: `${sender.name} sent you a message on DASHR: "${content.trim().slice(0, 120)}" — Open DASHR to reply.`,
        }).catch((err) => console.warn('[chat] First-message email failed:', err));

        // Mark this recipient as notified so we don't spam them
        await admin
          .from('orders')
          .update({ first_msg_email_sent_to: [...alreadySent, recipientId] })
          .eq('id', orderId);
      }
    } catch (emailErr) {
      // Non-fatal: message was already saved, just log
      console.warn('[chat] Could not send first-message email:', emailErr);
    }
  }

  return apiSuccess({ messageId: msg.id, created_at: msg.created_at });
});
