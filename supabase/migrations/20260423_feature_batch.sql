-- ══════════════════════════════════════════════════════════════
-- DASHR Feature Batch Migrations
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════

-- ── Feature #3: First-Timer Tips ──────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_tips BOOLEAN DEFAULT FALSE;

-- ── Feature #5: Dasher Role Bug Fix ───────────────────────────
-- Users now stay 'customer' until admin approves; this flag marks them as pending
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_agent BOOLEAN DEFAULT FALSE;

-- ── Feature #9 & #4: Profile ──────────────────────────────────
-- Ensure phone column exists (it may already)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── Feature #12: Order Expiry After 8 Hours ───────────────────
-- Add expires_at column (set at order creation = created_at + 8h)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing orders
UPDATE orders SET expires_at = created_at + INTERVAL '8 hours' WHERE expires_at IS NULL;

-- Index for efficient "non-expired pending" queries
CREATE INDEX IF NOT EXISTS orders_expires_at_idx ON orders (expires_at)
  WHERE status IN ('pending', 'assigned');

-- ── Feature #13: In-App Messaging System ──────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at  TIMESTAMPTZ DEFAULT now(),
  is_read     BOOLEAN DEFAULT FALSE
);

-- Enable Realtime for messages (Dashboard → Database → Replication → messages ✓)
-- OR run:
ALTER TABLE messages REPLICA IDENTITY FULL;

-- RLS: only the customer and the assigned dasher of that order can read/write
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_participants_only" ON messages;
CREATE POLICY "order_participants_only" ON messages
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE customer_id = auth.uid() OR agent_id = auth.uid()
    )
  );

-- Track which users have already received a "first message" email per order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_msg_email_sent_to UUID[] DEFAULT '{}';

-- ── Optional: Enable Realtime on orders table ──────────────────
-- (If not already enabled in Supabase Dashboard → Database → Replication)
ALTER TABLE orders REPLICA IDENTITY FULL;
