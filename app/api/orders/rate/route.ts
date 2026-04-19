import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { getUserSafe } from '@/lib/auth';
import { isValidUUID } from '@/lib/moderation';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { orderId, score } = await request.json();

  // Authenticate from session — DO NOT trust client-supplied raterId
  const authClient = await createClient();
  const sessionUser = await getUserSafe(authClient);
  if (!sessionUser) {
    return apiError('Unauthorized', 401);
  }
  const raterId = sessionUser.id;

  if (!orderId || !isValidUUID(orderId)) {
    return apiError('Valid orderId is required', 400);
  }

  if (!score || !Number.isInteger(score) || score < 1 || score > 5) {
    return apiError('Score must be an integer 1-5', 400);
  }

  const supabase = await createAdminClient();

  // Get the order and verify it's delivered
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, customer_id, agent_id, status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return apiError('Order not found', 404);
  }

  if (order.status !== 'delivered') {
    return apiError('Can only rate delivered orders', 400);
  }

  // Determine who is rating whom based on verified session identity
  let ratedId: string;
  let role: 'customer' | 'dasher';

  if (raterId === order.customer_id) {
    if (!order.agent_id) {
      return apiError('No dasher assigned to this order', 400);
    }
    ratedId = order.agent_id;
    role = 'customer';
  } else if (raterId === order.agent_id) {
    ratedId = order.customer_id;
    role = 'dasher';
  } else {
    return apiError('You are not part of this order', 403);
  }

  // Check for duplicate rating
  const { data: existing } = await supabase
    .from('ratings')
    .select('id')
    .eq('order_id', orderId)
    .eq('rater_id', raterId)
    .single();

  if (existing) {
    return apiError('You have already rated this order', 409);
  }

  // Insert the rating
  const { error: insertError } = await supabase
    .from('ratings')
    .insert({
      order_id: orderId,
      rater_id: raterId,
      rated_id: ratedId,
      score,
      role,
    });

  if (insertError) {
    console.error('[rate] Insert rating error:', insertError);
    return apiError('Failed to submit rating', 500);
  }

  // Recalculate the rated user's average rating
  const { data: allRatings } = await supabase
    .from('ratings')
    .select('score')
    .eq('rated_id', ratedId);

  if (allRatings && allRatings.length > 0) {
    const avg = allRatings.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / allRatings.length;
    await supabase
      .from('users')
      .update({ rating: Math.round(avg * 100) / 100 })
      .eq('id', ratedId);
  }

  return apiSuccess({});
});
