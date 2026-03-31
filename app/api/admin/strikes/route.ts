import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { STRIKES_TO_OFFBOARD } from '@/lib/constants';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { agentId, reason, orderId } = await request.json();
  if (!agentId || !reason) {
    return NextResponse.json({ ok: false, error: 'agentId and reason are required' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Insert strike
  await supabase.from('strikes').insert({ agent_id: agentId, order_id: orderId || null, reason });

  // Get current agent data
  const { data: agent } = await supabase.from('users').select('strikes, srm_id, name').eq('id', agentId).single();
  if (!agent) return NextResponse.json({ ok: false, error: 'Agent not found' }, { status: 404 });

  const newStrikes = (agent.strikes || 0) + 1;
  let offboarded = false;

  if (newStrikes >= STRIKES_TO_OFFBOARD) {
    // Offboard agent — hash their SRM ID to block re-registration
    const blockedIdHash = agent.srm_id ? crypto.createHash('sha256').update(agent.srm_id).digest('hex') : null;
    await supabase.from('users').update({
      strikes: newStrikes,
      is_verified: false,
      is_online: false,
      blocked_id_hash: blockedIdHash,
    }).eq('id', agentId);
    offboarded = true;
  } else {
    await supabase.from('users').update({ strikes: newStrikes }).eq('id', agentId);
  }

  return NextResponse.json({ ok: true, newStrikes, offboarded });
}
