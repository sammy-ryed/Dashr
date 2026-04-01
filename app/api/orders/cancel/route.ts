import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { apiSuccess, apiError, withErrorHandling } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { orderId, userId } = await request.json();

  if (!orderId || !userId) {
    return apiError('orderId and userId are required', 400);
  }

  const supabase = await createAdminClient();

  // Verify order belongs to user and is still pending
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, customer_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return apiError('Order not found', 404);
  }

  if (order.customer_id !== userId) {
    return apiError('You can only cancel your own orders', 403);
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

  return apiSuccess({ message: 'Order cancelled successfully' });
});
