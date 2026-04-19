import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { sendTrackedEmail } from '@/lib/communication-policy';
import { checkUserBan, isValidUUID } from '@/lib/moderation';
import { orderAcceptLimiter } from '@/lib/rate-limit';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';

const MAX_ACTIVE_ORDERS = 3;

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { orderId } = await request.json();

  // Validate orderId — never trust agentId from client body
  if (!orderId || !isValidUUID(orderId)) {
    return apiError('Valid orderId is required', 400);
  }

  // Authenticate from session — DO NOT trust client-supplied agentId
  const authClient = await createClient();
  const sessionUser = await getUserSafe(authClient);
  if (!sessionUser) {
    return apiError('Unauthorized', 401);
  }
  const agentId = sessionUser.id;

  const supabase = await createAdminClient();

  // Rate limit
  const rl = orderAcceptLimiter.check(agentId);
  if (!rl.allowed) {
    return apiError('Too many accept attempts. Slow down.', 429);
  }

  // Ban check
  const banCheck = await checkUserBan(supabase, agentId);
  if (banCheck.isBanned) {
    return apiError('Your account is suspended. You cannot accept orders.', 403);
  }

  const { data: agent, error: agentError } = await supabase
    .from('users')
    .select('id, role, is_verified, is_online, rating')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    return apiError('Agent not found', 404);
  }

  if (agent.role !== 'agent') {
    return apiError('User is not a dasher', 403);
  }

  if (!agent.is_verified) {
    return apiError(
      'Your account is not yet verified. Please wait for admin approval before accepting deliveries.',
      403,
    );
  }

  if (!agent.is_online) {
    return apiError('You must be online to accept orders.', 403);
  }

  // Enforce max in-progress deliveries per dasher
  const { count: activeOrdersCount, error: activeOrdersError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .in('status', ['assigned', 'picked_up']);

  if (activeOrdersError) {
    return apiError('Failed to validate active deliveries', 500);
  }

  if ((activeOrdersCount || 0) >= MAX_ACTIVE_ORDERS) {
    return apiError(
      `You can take up to ${MAX_ACTIVE_ORDERS} active orders at once. Complete one first.`,
      409,
    );
  }

  // Check that the order is still pending
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, agent_id, customer_id, item_description, pickup_location')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return apiError('Order not found', 404);
  }

  // Prevent dasher from accepting their own order
  if (order.customer_id === agentId) {
    return apiError('You cannot accept your own order', 403);
  }

  if (order.status !== 'pending') {
    return apiError('This order has already been taken by another dasher.', 409);
  }

  // Atomic update — only succeeds if still pending (prevents race conditions)
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      agent_id: agentId,
      status: 'assigned',
    })
    .eq('id', orderId)
    .eq('status', 'pending')
    .select('id, customer_id, item_description, pickup_location')
    .single();

  if (updateError || !updated) {
    return apiError('This order was just taken by another dasher. Try another one!', 409);
  }

  // Safety check for concurrent accepts: roll back if cap exceeded
  const { count: finalActiveOrdersCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .in('status', ['assigned', 'picked_up']);

  if ((finalActiveOrdersCount || 0) > MAX_ACTIVE_ORDERS) {
    await supabase
      .from('orders')
      .update({ agent_id: null, status: 'pending' })
      .eq('id', updated.id)
      .eq('agent_id', agentId)
      .eq('status', 'assigned');

    return apiError(`You already reached the ${MAX_ACTIVE_ORDERS}-order active limit.`, 409);
  }

  const { data: customer } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', updated.customer_id)
    .single();

  if (customer?.email) {
    await sendTrackedEmail(supabase, {
      eventType: 'order_accepted_customer',
      priority: 'critical',
      to: customer.email,
      orderId: updated.id,
      subject: 'Your DASHR order has been accepted',
      text: `Your order has been accepted and pickup will begin soon.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
          <h2 style="margin:0 0 8px 0;">Order Accepted</h2>
          <p style="margin:0 0 8px 0;">Hi ${customer.name || 'there'}, a dasher has accepted your order.</p>
          <p style="margin:0;"><b>Item:</b> ${updated.item_description}</p>
          <p style="margin:0;"><b>Pickup:</b> ${updated.pickup_location}</p>
          <p style="margin-top:12px;">Track live status in DASHR.</p>
        </div>
      `,
    });
  }

  return apiSuccess({ orderId: updated.id });
});
