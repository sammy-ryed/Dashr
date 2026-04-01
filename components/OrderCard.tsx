import type { Order } from '@/types';
import { ZONE_LABELS } from '@/lib/config';

interface OrderCardProps {
  order: Order;
  onAccept?: (orderId: string) => void;
  onPickedUp?: (orderId: string) => void;
  onDeliver?: (orderId: string) => void;
  showActions?: boolean;
  compact?: boolean;
}

const statusBadges: Record<string, string> = {
  pending:   'badge badge-y',
  assigned:  'badge badge-b',
  picked_up: 'badge badge-o',
  delivered: 'badge badge-gf',
  cancelled: 'badge badge-r',
};

const statusLabels: Record<string, string> = {
  pending:   'Pending',
  assigned:  'Assigned',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const zoneBadges: Record<string, string> = {
  on_campus:  'badge badge-yf',
  shiv_temple:'badge badge-y',
  off_campus: 'badge badge-y',
};

export default function OrderCard({ order, onAccept, onPickedUp, onDeliver, showActions = true }: OrderCardProps) {
  const shortId = order.id.slice(-4).toUpperCase();

  return (
    <div className="order-card">
      <div className="oc-head">
        <span className="oc-id">ORDER_#{shortId}</span>
        <span className={statusBadges[order.status]}>{statusLabels[order.status]}</span>
      </div>

      <div className="oc-title">{order.item_description.slice(0, 60)}{order.item_description.length > 60 ? '…' : ''}</div>
      <div className="oc-meta">From: {order.pickup_location} — To: {order.delivery_hostel} {order.delivery_room}</div>
      <div className="oc-meta">Value: {order.order_value}</div>

      <div className="oc-foot">
        <div>
          <div className="oc-comm">₹{order.commission_amount}</div>
          <span className={zoneBadges[order.pickup_zone]} style={{ marginTop: '0.3rem', display: 'inline-block' }}>
            {ZONE_LABELS[order.pickup_zone]}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <span className={order.payment_method === 'agent_float' ? 'badge badge-w' : 'badge badge-r'}>
            {order.payment_method === 'agent_float' ? 'Dasher Float' : 'UPI On Delivery'}
          </span>
          {showActions && order.status === 'pending' && onAccept && (
            <button className="btn btn-primary btn-sm" onClick={() => onAccept(order.id)}>Accept</button>
          )}
          {showActions && order.status === 'assigned' && onPickedUp && (
            <button className="btn btn-ghost btn-sm" onClick={() => onPickedUp(order.id)}>Picked Up →</button>
          )}
          {showActions && order.status === 'picked_up' && onDeliver && (
            <button className="btn btn-primary btn-sm" onClick={() => onDeliver(order.id)}>Deliver ✓</button>
          )}
        </div>
      </div>
    </div>
  );
}
