-- ════════════════════════════════════════════════════════════════
-- DASHR — Migration 002: OTP Codes + RLS Fixes
-- Run this in the Supabase SQL Editor AFTER 001_init.sql
-- ════════════════════════════════════════════════════════════════

-- ── OTP CODES TABLE ─────────────────────────────────────────────
-- Stores email OTP codes for custom auth (no Supabase email dependency)
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Service-role only access (API routes use admin client)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role can read/write OTP codes

-- Index for fast lookups during verification
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_code ON public.otp_codes (email, code);

-- Auto-cleanup expired OTPs (run periodically via Supabase cron or manual)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-otps', '*/30 * * * *', 'DELETE FROM public.otp_codes WHERE expires_at < now() OR used = true');

-- ── RLS FIX: Agents can INSERT into ledger ──────────────────────
-- (Missing from 001_init.sql — agents couldn't record deliveries)
CREATE POLICY "Agents: insert own ledger" ON public.ledger
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

-- ── RLS FIX: Customers can SELECT orders via ID ─────────────────
-- (The original policy only works when querying by customer_id;
--  this also covers direct order lookups e.g. /order/[id]/status)
-- Already covered by "Customers: read own orders" but let's ensure
-- agents can also read their assigned orders
CREATE POLICY "Agents: read assigned orders" ON public.orders
  FOR SELECT USING (
    agent_id = auth.uid()
  );
