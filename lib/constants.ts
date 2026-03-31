// ── COMMISSION FLOORS (easily changeable) ──────────────────────────────────
export const COMMISSION_FLOORS = {
  on_campus: 20,
  shiv_temple: 30,
  off_campus: 40,
} as const;

// ── PAYMENT METHOD THRESHOLD (easily changeable) ────────────────────────────
// Orders below this value → agent_float; at or above → upi_on_delivery
export const AGENT_FLOAT_THRESHOLD = 200;

// ── STRIKE SYSTEM ───────────────────────────────────────────────────────────
export const STRIKES_TO_OFFBOARD = 3;

// ── ZONE LABELS ─────────────────────────────────────────────────────────────
export const ZONE_LABELS = {
  on_campus: 'On Campus',
  shiv_temple: 'Shiv Temple',
  off_campus: 'Off Campus',
} as const;

// ── OFF-CAMPUS LOCATIONS ────────────────────────────────────────────────────
export const OFF_CAMPUS_LOCATIONS = ['Aborde', 'Potheri', 'Maraimalai Nagar'];

// ── ORDER STATUS STEPS ──────────────────────────────────────────────────────
export const ORDER_STATUS_STEPS = [
  { key: 'pending',   label: 'Placed',           icon: '📋' },
  { key: 'assigned',  label: 'Dasher Assigned',   icon: '👤' },
  { key: 'picked_up', label: 'Picked Up',         icon: '↑'  },
  { key: 'delivered', label: 'At Your Door',       icon: '🏠' },
] as const;

export type Zone = keyof typeof COMMISSION_FLOORS;
export type OrderStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
export type PaymentMethod = 'agent_float' | 'upi_on_delivery';
export type UserRole = 'customer' | 'agent' | 'admin';
export type LedgerType = 'commission' | 'reimbursement';
