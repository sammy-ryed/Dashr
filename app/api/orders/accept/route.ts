import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

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
      .select('id, status, agent_id')
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
      .select('id')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({
        ok: false,
        error: 'This order was just taken by another dasher. Try another one!',
      }, { status: 409 });
    }

    return NextResponse.json({ ok: true, orderId: updated.id });
  } catch (err) {
    console.error('Accept order error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
