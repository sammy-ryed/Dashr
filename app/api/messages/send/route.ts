import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';

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

  // Verify the user is a participant in this order
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_id, agent_id, status')
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

  return apiSuccess({ messageId: msg.id, created_at: msg.created_at });
});
