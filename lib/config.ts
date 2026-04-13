/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — Centralized Configuration
 * ═══════════════════════════════════════════════════════════════
 * Single source of truth for all app configuration.
 * Feature flags, tunables, and environment validation.
 *
 * To add a new feature:
 *   1. Add a flag in FEATURES
 *   2. Add any related config in the relevant section
 *   3. Use `config.features.yourFlag` in code
 */

function intFromEnv(key: string, fallback: number) {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

// ── FEATURE FLAGS ─────────────────────────────────────────────
// Toggle features on/off without touching code
export const FEATURES = {
  /** UPI QR payment on order status page */
  UPI_PAYMENTS: false,
  /** OCR-based ID card verification */
  OCR_VERIFICATION: true,
  /** Realtime order updates via Supabase channels */
  REALTIME_ORDERS: true,
  /** Agent priority queue for high-rated dashers */
  PRIORITY_QUEUE: true,
  /** Email OTP authentication */
  EMAIL_OTP: true,
} as const;

// ── COMMISSION FLOORS ─────────────────────────────────────────
export const COMMISSION_FLOORS = {
  on_campus: 20,
  shiv_temple: 30,
  off_campus: 40,
} as const;

// ── PAYMENT ───────────────────────────────────────────────────
/** Orders below this → agent_float; at or above → upi_on_delivery */
export const AGENT_FLOAT_THRESHOLD = 200;

/** UPI ID for payment collection (set when FEATURES.UPI_PAYMENTS = true) */
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'dashr@upi';

// ── STRIKE SYSTEM ─────────────────────────────────────────────
export const STRIKES_TO_OFFBOARD = 3;

// ── ZONE CONFIG ───────────────────────────────────────────────
export const ZONE_LABELS = {
  on_campus: 'On Campus',
  shiv_temple: 'Shiv Temple',
  off_campus: 'Off Campus',
} as const;

export const OFF_CAMPUS_LOCATIONS = ['Aborde', 'Potheri', 'Maraimalai Nagar'];

// ── ORDER STATUS ──────────────────────────────────────────────
export const ORDER_STATUS_STEPS = [
  { key: 'pending',   label: 'Placed',         icon: '01' },
  { key: 'assigned',  label: 'Dasher Assigned', icon: '02' },
  { key: 'picked_up', label: 'Picked Up',       icon: '03' },
  { key: 'delivered', label: 'At Your Door',     icon: '04' },
] as const;

// ── SRM HOSTELS ───────────────────────────────────────────────
// Block names from A-Z, excluding I, O, X (which don't exist)
export const VALID_BLOCKS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'Y', 'Z',
] as const;

export const SRM_HOSTELS_NEW = {
  boys: [
    'Sannasi A',
    'Sannasi C',
    'Manoranjitham',
    'Mullai',
    'Paari',
    'Kaari',
    'Oori',
    'Adiyaman',
    'Nelson Mandela Block',
    'Began',
  ],
  girls: [
    'ESQ A',
    'ESQ B',
    'Shenbagam',
    'Kalpana Chawla',
    'Meenakshi',
    'Kopperundevi (M Block)',
  ],
  international: [
    'Green Pearl',
    'NRI Hostel',
    'Tamarai',
    'Malligai',
  ],
} as const;

// Abode location with block structure
export const ABODE_BLOCKS = VALID_BLOCKS;

// Flat list for backward compatibility if needed
export const SRM_HOSTELS = [
  'Sannasi A', 'Sannasi C', 'Manoranjitham', 'Mullai', 'Paari', 'Kaari', 'Oori', 'Adiyaman',
  'Nelson Mandela Block', 'Began', 'ESQ A', 'ESQ B', 'Shenbagam', 'Kalpana Chawla',
  'Meenakshi', 'Kopperundevi (M Block)', 'Green Pearl', 'NRI Hostel', 'Tamarai', 'Malligai',
  'Abode', 'Other (Custom)',
] as const;

// ── OTP CONFIG ────────────────────────────────────────────────
export const OTP_CONFIG = {
  /** Length of the OTP code */
  length: 6,
  /** Time in minutes before OTP expires */
  expiryMinutes: 10,
  /** Maximum OTP send attempts per email in a 10-min window */
  maxAttemptsPerWindow: 3,
  /** Cooldown between OTP sends to same email (seconds) */
  cooldownSeconds: 60,
} as const;

// ── EMAIL CONFIG ──────────────────────────────────────────────
export const EMAIL_CONFIG = {
  provider: 'brevo',
  from: {
    name: process.env.BREVO_SENDER_NAME || 'DASHR',
    address: process.env.BREVO_SENDER_EMAIL || '',
  },
  dailySoftLimit: intFromEnv('EMAIL_DAILY_SOFT_LIMIT', 260),
  dasherOpportunityMinCommission: intFromEnv('EMAIL_DASHER_MIN_COMMISSION', 70),
  dasherOpportunityMaxRecipients: intFromEnv('EMAIL_DASHER_MAX_RECIPIENTS', 3),
  dasherOpportunityCooldownMinutes: intFromEnv('EMAIL_DASHER_COOLDOWN_MINUTES', 45),
} as const;

// ── DERIVED TYPES ─────────────────────────────────────────────
export type Zone = keyof typeof COMMISSION_FLOORS;
export type OrderStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
export type PaymentMethod = 'agent_float' | 'upi_on_delivery';
export type UserRole = 'customer' | 'agent' | 'admin';
export type LedgerType = 'commission' | 'reimbursement';

// ── ENVIRONMENT VALIDATION ────────────────────────────────────
// Call this at app startup to catch missing env vars early
export function validateEnv(): string[] {
  const errors: string[] = [];
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  if (FEATURES.EMAIL_OTP) {
    required.push('BREVO_API_KEY', 'BREVO_SENDER_EMAIL');
  }

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }
  return errors;
}
