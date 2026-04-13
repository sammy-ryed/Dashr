import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendTrackedEmail } from '@/lib/communication-policy';

export async function POST(request: NextRequest) {
  try {
    const { orderId, agentId } = await request.json();

    if (!orderId || !agentId) {
      return NextResponse.json({ ok: false, error: 'Missing orderId or agentId' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // 1. Verify the agent is verified AND online
    const { data: agent, error: agentError } = await supabase
      .from('users')
      .select('id, role, is_verified, is_online, rating')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ ok: false, error: 'Agent not found' }, { status: 404 });
    }

    if (agent.role !== 'agent') {
      return NextResponse.json({ ok: false, error: 'User is not a dasher' }, { status: 403 });
    }

    if (!agent.is_verified) {
      return NextResponse.json({
        ok: false,
        error: 'Your account is not yet verified. Please wait for admin approval before accepting deliveries.',
      }, { status: 403 });
    }

    if (!agent.is_online) {
      return NextResponse.json({
        ok: false,
        error: 'You must be online to accept orders.',
      }, { status: 403 });
    }

    // 2. Check that the order is still pending 
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, agent_id, customer_id, item_description, pickup_location')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({
        ok: false,
        error: 'This order has already been taken by another dasher.',
      }, { status: 409 });
    }

    // 3. Check if another agent is also trying to accept (priority queue)
    // We use an atomic update with a WHERE status = 'pending' to prevent race conditions
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        agent_id: agentId,
        status: 'assigned',
      })
      .eq('id', orderId)
      .eq('status', 'pending') // Atomic: only succeeds if still pending
      .select('id, customer_id, item_description, pickup_location')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({
        ok: false,
        error: 'This order was just taken by another dasher. Try another one!',
      }, { status: 409 });
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
        subject: 'DASHR order accepted by a dasher',
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

    return NextResponse.json({ ok: true, orderId: updated.id });
  } catch (err) {
    console.error('Accept order error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
