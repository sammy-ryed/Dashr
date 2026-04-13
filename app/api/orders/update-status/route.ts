import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { sendTrackedEmail } from '@/lib/communication-policy';

type AllowedStatus = 'picked_up' | 'delivered';

const ALLOWED_NEXT = new Set<AllowedStatus>(['picked_up', 'delivered']);

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { orderId, status } = (await request.json()) as {
    orderId?: string;
    status?: AllowedStatus;
  };

  if (!orderId || !status || !ALLOWED_NEXT.has(status)) {
    return apiError('orderId and a valid status are required', 400);
  }

  const authClient = await createClient();
  const user = await getUserSafe(authClient);

  if (!user) {
    return apiError('Unauthorized', 401);
  }

  const { data: order, error: orderError } = await authClient
    .from('orders')
    .select('id, agent_id, customer_id, status, item_description, delivery_hostel')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return apiError('Order not found', 404);
  }

  if (order.agent_id !== user.id) {
    return apiError('You can only update your assigned orders', 403);
  }

  const validTransition =
    (status === 'picked_up' && order.status === 'assigned') ||
    (status === 'delivered' && order.status === 'picked_up');

  if (!validTransition) {
    return apiError(`Invalid transition from ${order.status} to ${status}`, 409);
  }

  const { error: updateError } = await authClient
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('agent_id', user.id);

  if (updateError) {
    return apiError(updateError.message || 'Failed to update status', 500);
  }

  if (status === 'delivered') {
    const admin = await createAdminClient();
    const { data: customer } = await admin
      .from('users')
      .select('email, name')
      .eq('id', order.customer_id)
      .single();

    if (customer?.email) {
      await sendTrackedEmail(admin, {
        eventType: 'order_delivered_customer',
        priority: 'critical',
        to: customer.email,
        orderId,
        subject: 'DASHR order delivered successfully',
        text: `Your order has been delivered successfully. Please open DASHR to review and rate the dasher.`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
            <h2 style="margin:0 0 8px 0;">Order Delivered</h2>
            <p style="margin:0 0 8px 0;">Hi ${customer.name || 'there'}, your order was delivered successfully.</p>
            <p style="margin:0;"><b>Item:</b> ${order.item_description}</p>
            <p style="margin:0;"><b>Drop:</b> ${order.delivery_hostel}</p>
            <p style="margin-top:12px;">Open DASHR to rate your delivery experience.</p>
          </div>
        `,
      });
    }
  }

  return apiSuccess({ message: `Order marked as ${status}` });
});
