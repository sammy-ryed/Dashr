import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, raterId, score } = await request.json();

    if (!orderId || !raterId || !score) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json({ ok: false, error: 'Score must be 1-5' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // 1. Get the order and verify it's delivered
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_id, agent_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ ok: false, error: 'Can only rate delivered orders' }, { status: 400 });
    }

    // 2. Determine who is rating whom
    let ratedId: string;
    let role: 'customer' | 'dasher';

    if (raterId === order.customer_id) {
      // Customer rating the dasher
      if (!order.agent_id) {
        return NextResponse.json({ ok: false, error: 'No dasher assigned to this order' }, { status: 400 });
      }
      ratedId = order.agent_id;
      role = 'customer'; // the rater's role
    } else if (raterId === order.agent_id) {
      // Dasher rating the customer
      ratedId = order.customer_id;
      role = 'dasher';
    } else {
      return NextResponse.json({ ok: false, error: 'You are not part of this order' }, { status: 403 });
    }

    // 3. Check for duplicate rating
    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('order_id', orderId)
      .eq('rater_id', raterId)
      .single();

    if (existing) {
      return NextResponse.json({ ok: false, error: 'You have already rated this order' }, { status: 409 });
    }

    // 4. Insert the rating
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
      console.error('Insert rating error:', insertError);
      return NextResponse.json({ ok: false, error: 'Failed to submit rating' }, { status: 500 });
    }

    // 5. Recalculate the rated user's average rating
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Rate order error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
