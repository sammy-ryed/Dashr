-- ════════════════════════════════════════════════════════════════
-- DASHR — Migration 003: Fix infinite recursion in users RLS
-- ════════════════════════════════════════════════════════════════
-- Problem: Policies on "users" table query "users" to check roles,
-- which triggers the same policies → infinite loop.
-- Fix: SECURITY DEFINER function bypasses RLS for the role check.

-- ── Helper function (runs as table owner, skips RLS) ────────────
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- ── Drop the broken policies ────────────────────────────────────
DROP POLICY IF EXISTS "Agents: read all users" ON public.users;
DROP POLICY IF EXISTS "Admin: full users" ON public.users;

-- ── Recreate with the helper function (no recursion) ────────────
CREATE POLICY "Agents: read all users" ON public.users
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('agent', 'admin')
  );

CREATE POLICY "Admin: full users" ON public.users
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- ── Also fix orders policies that reference users table ─────────
DROP POLICY IF EXISTS "Agents: read pending orders" ON public.orders;
DROP POLICY IF EXISTS "Agents: update orders" ON public.orders;
DROP POLICY IF EXISTS "Admin: full orders" ON public.orders;
DROP POLICY IF EXISTS "Admin: full ledger" ON public.ledger;
DROP POLICY IF EXISTS "Admin: full strikes" ON public.strikes;

CREATE POLICY "Agents: read pending orders" ON public.orders
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'agent'
  );

CREATE POLICY "Agents: update orders" ON public.orders
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'agent'
    AND (agent_id = auth.uid() OR status = 'pending')
  );

CREATE POLICY "Admin: full orders" ON public.orders
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admin: full ledger" ON public.ledger
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Admin: full strikes" ON public.strikes
  FOR ALL USING (
    public.get_user_role(auth.uid()) = 'admin'
  );
