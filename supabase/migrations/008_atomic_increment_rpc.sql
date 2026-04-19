-- ═══════════════════════════════════════════════════════════════
-- Migration 008: Atomic total_deliveries increment RPC
-- ═══════════════════════════════════════════════════════════════
-- Replaces the read-then-write increment in update-status/route.ts
-- with a single atomic UPDATE to prevent race conditions when two
-- deliveries complete simultaneously for the same agent.

CREATE OR REPLACE FUNCTION increment_deliveries(user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE users
  SET total_deliveries = COALESCE(total_deliveries, 0) + 1
  WHERE id = user_id;
$$;

-- Grant execute to the service role only (called server-side via admin client)
REVOKE ALL ON FUNCTION increment_deliveries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_deliveries(uuid) TO service_role;
