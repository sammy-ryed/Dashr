import type { Zone, OrderStatus, PaymentMethod, UserRole, LedgerType } from '@/lib/config';

export type ReportReason = 'abuse' | 'scam' | 'fake_order' | 'no_show' | 'harassment' | 'payment_issue' | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BanType = 'temporary' | 'permanent';
export type AppealStatus = 'pending' | 'reviewing' | 'approved' | 'denied';

export interface User {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  srm_id?: string;
  id_card_url?: string;
  is_verified: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  rating: number;
  total_deliveries: number;
  strikes: number;
  is_online: boolean;
  blocked_id_hash: string | null;
  accepted_policy_version: string | null;
  accepted_policy_at: string | null;
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
  agent?: Pick<User, 'id' | 'name' | 'rating' | 'phone'>;
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

export interface NotificationItem {
  id: string;
  user_id: string;
  order_id: string | null;
  kind:
    | 'order_placed'
    | 'order_available'
    | 'order_assigned_customer'
    | 'order_assigned_agent'
    | 'order_picked_up'
    | 'order_delivered'
    | 'order_cancelled'
    | 'order_issue';
  title: string;
  message: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  order_id: string | null;
  reason: ReportReason;
  notes: string;
  evidence_urls: string[];
  status: ReportStatus;
  severity: ReportSeverity | null;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  // joined
  reporter?: Pick<User, 'id' | 'name' | 'email'>;
  reported?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
}

export interface Ban {
  id: string;
  user_id: string;
  banned_by: string;
  ban_type: BanType;
  reason: string;
  related_report_id: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  unbanned_by: string | null;
  unbanned_at: string | null;
  unban_reason: string | null;
  created_at: string;
  // joined
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  admin?: Pick<User, 'id' | 'name'>;
}

export interface Appeal {
  id: string;
  ban_id: string;
  user_id: string;
  appeal_text: string;
  status: AppealStatus;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  user?: Pick<User, 'id' | 'name' | 'email'>;
  ban?: Pick<Ban, 'id' | 'ban_type' | 'reason' | 'expires_at'>;
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  // joined
  admin?: Pick<User, 'id' | 'name'>;
  target_user?: Pick<User, 'id' | 'name'>;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  abuse: 'Abusive Behavior',
  scam: 'Scam / Fraud',
  fake_order: 'Fake Order',
  no_show: 'No-Show',
  harassment: 'Harassment',
  payment_issue: 'Payment Issue',
  other: 'Other',
};
