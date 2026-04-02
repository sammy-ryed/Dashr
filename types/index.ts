import type { Zone, OrderStatus, PaymentMethod, UserRole, LedgerType } from '@/lib/config';

export interface User {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  srm_id?: string;
  id_card_url?: string;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  strikes: number;
  is_online: boolean;
  blocked_id_hash: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  agent_id: string | null;
  item_description: string;
  pickup_location: string;
  pickup_zone: Zone;
  delivery_hostel: string;
  delivery_room: string;
  order_value: number;
  commission_amount: number;
  min_commission: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // joined data
  customer?: Pick<User, 'id' | 'name' | 'phone'>;
  agent?: Pick<User, 'id' | 'name' | 'rating'>;
}

export interface LedgerEntry {
  id: string;
  agent_id: string;
  order_id: string;
  type: LedgerType;
  amount: number;
  week_start: string;
  is_paid: boolean;
  created_at: string;
  order?: Pick<Order, 'id' | 'pickup_zone' | 'payment_method' | 'order_value'>;
}

export interface Strike {
  id: string;
  agent_id: string;
  order_id: string;
  reason: string;
  created_at: string;
}
