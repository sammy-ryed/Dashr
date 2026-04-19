import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { apiSuccess, apiError, withErrorHandling } from '@/lib/api-helpers';
import { getUserSafe } from '@/lib/auth';
import { isValidUUID } from '@/lib/moderation';
import { checkCancelAbuse, getCooldown } from '@/lib/fraud';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { orderId } = await request.json();

  if (!orderId || !isValidUUID(orderId)) {
    return apiError('Valid orderId is required', 400);
  }

  // Verify auth — don't trust client-provided userId
  const authClient = await createClient();
  const user = await getUserSafe(authClient);
  if (!user) return apiError('Unauthorized', 401);

  const supabase = await createAdminClient();

  // Fetch order to verify ownership
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, agent_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return apiError('Order not found', 404);
  }

  // Only the customer or assigned dasher (or admin) can cancel
  const isCustomer = order.customer_id === user.id;
  const isDasher   = order.agent_id === user.id;

  if (!isCustomer && !isDasher) {
    // Check if admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return apiError('You cannot cancel this order', 403);
    }
  }

  if (order.status !== 'pending') {
    return apiError(
      `Cannot cancel — order is already ${order.status.replace('_', ' ')}`,
      409,
    );
  }

  // Cancel the order
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);

  if (updateError) {
    return apiError('Failed to cancel order', 500);
  }

  // Check and enforce cancel abuse (non-blocking — only applies to customers)
  if (isCustomer) {
    await checkCancelAbuse(supabase, user.id).catch(() => {});
    const cooldown = getCooldown(user.id);
    if (cooldown.active) {
      // Still let the cancel go through, but warn them
      return apiSuccess({
        message: 'Order cancelled successfully',
        warning: cooldown.reason,
      });
    }
  }

  return apiSuccess({ message: 'Order cancelled successfully' });
});

