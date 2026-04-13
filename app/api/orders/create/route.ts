import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase-server';
import { EMAIL_CONFIG } from '@/lib/config';
import { getUserSafe } from '@/lib/auth';
import { apiError, apiSuccess, withErrorHandling } from '@/lib/api-helpers';
import { sendTrackedEmail, shouldSendDasherOpportunityEmail } from '@/lib/communication-policy';

const VALID_ZONES = new Set(['on_campus', 'shiv_temple', 'off_campus']);
const VALID_PAYMENT_METHODS = new Set(['agent_float', 'upi_on_delivery']);

interface CreateOrderBody {
  itemDescription: string;
  pickupLocation: string;
  pickupZone: string;
  deliveryHostel: string;
  deliveryRoom: string;
  orderValue: number;
  commissionAmount: number;
  minCommission: number;
  paymentMethod: string;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = (await request.json()) as Partial<CreateOrderBody>;

  const itemDescription = body.itemDescription?.trim() || '';
  const pickupLocation = body.pickupLocation?.trim() || '';
  const pickupZone = body.pickupZone || '';
  const deliveryHostel = body.deliveryHostel?.trim() || '';
  const deliveryRoom = body.deliveryRoom?.trim() || '';
  const orderValue = Number(body.orderValue || 0);
  const commissionAmount = Number(body.commissionAmount || 0);
  const minCommission = Number(body.minCommission || 0);
  const paymentMethod = body.paymentMethod || '';

  if (!itemDescription || !pickupLocation || !deliveryHostel || !deliveryRoom) {
    return apiError('Missing required order fields', 400);
  }
  if (!VALID_ZONES.has(pickupZone)) {
    return apiError('Invalid pickup zone', 400);
  }
  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
    return apiError('Invalid payment method', 400);
  }
  if (!Number.isFinite(orderValue) || orderValue <= 0) {
    return apiError('Order value must be greater than 0', 400);
  }
  if (!Number.isFinite(commissionAmount) || commissionAmount <= 0) {
    return apiError('Commission must be greater than 0', 400);
  }

  const authClient = await createClient();
  const user = await getUserSafe(authClient);

  if (!user) {
    return apiError('Unauthorized', 401);
  }

  const { data: inserted, error: insertError } = await authClient
    .from('orders')
    .insert({
      customer_id: user.id,
      item_description: itemDescription,
      pickup_location: pickupLocation,
      pickup_zone: pickupZone,
      delivery_hostel: deliveryHostel,
      delivery_room: deliveryRoom,
      order_value: orderValue,
      commission_amount: commissionAmount,
      min_commission: minCommission,
      payment_method: paymentMethod,
      status: 'pending',
    })
    .select('id, commission_amount, pickup_location, delivery_hostel')
    .single();

  if (insertError || !inserted) {
    return apiError(insertError?.message || 'Failed to place order', 500);
  }

  if (shouldSendDasherOpportunityEmail(inserted.commission_amount)) {
    const admin = await createAdminClient();

    const { data: agents } = await admin
      .from('users')
      .select('id, name, email, rating')
      .eq('role', 'agent')
      .eq('is_verified', true)
      .eq('is_online', true)
      .not('email', 'is', null)
      .order('rating', { ascending: false })
      .limit(EMAIL_CONFIG.dasherOpportunityMaxRecipients);

    const candidates =
      (agents as Array<{ id: string; name: string | null; email: string | null }> | null)?.filter(
        (agent) => !!agent.email,
      ) || [];

    await Promise.allSettled(
      candidates.map((agent) =>
        sendTrackedEmail(admin, {
          eventType: 'order_opportunity_dasher',
          to: agent.email!,
          orderId: inserted.id,
          subject: `High-value DASHR order available (₹${inserted.commission_amount} commission)`,
          text: `A new DASHR delivery is available with commission ₹${inserted.commission_amount}. Pickup at ${inserted.pickup_location}.`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
              <h2 style="margin:0 0 8px 0;">New Delivery Opportunity</h2>
              <p style="margin:0 0 8px 0;">A high-value order is available now.</p>
              <p style="margin:0;"><b>Commission:</b> ₹${inserted.commission_amount}</p>
              <p style="margin:0;"><b>Pickup:</b> ${inserted.pickup_location}</p>
              <p style="margin:0;"><b>Drop:</b> ${inserted.delivery_hostel}</p>
              <p style="margin-top:12px;">Open DASHR to accept quickly.</p>
            </div>
          `,
        }),
      ),
    );
  }

  return apiSuccess({ orderId: inserted.id }, 201);
});
