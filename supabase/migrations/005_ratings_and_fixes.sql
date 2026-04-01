-- ════════════════════════════════════════════════════════════════
-- DASHR — Migration 005: Ratings Table + Accept-Order RLS Fix
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ── RATINGS TABLE ──────────────────────────────────────────────
-- Mutual rating system: customer rates dasher, dasher rates customer
create table if not exists public.ratings (
  id         uuid primary key default uuid_generate_v4(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  rater_id   uuid not null references public.users(id) on delete cascade,
  rated_id   uuid not null references public.users(id) on delete cascade,
  score      integer not null check (score >= 1 and score <= 5),
  role       text not null check (role in ('customer', 'dasher')),
  created_at timestamptz not null default now(),
  -- Each user can only rate once per order
  unique(order_id, rater_id)
);

alter table public.ratings enable row level security;

-- Users can insert their own ratings
create policy "Users: insert own rating" on public.ratings
  for insert with check (auth.uid() = rater_id);

-- Users can read ratings where they are the rater or the rated
create policy "Users: read own ratings" on public.ratings
  for select using (auth.uid() = rater_id or auth.uid() = rated_id);

-- Admin: full access
create policy "Admin: full ratings" on public.ratings
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ── FIX: Stricter agent order-update policy ────────────────────
-- Drop existing permissive policy and replace with stricter one
-- that requires BOTH is_verified AND is_online to accept pending orders
drop policy if exists "Agents: update orders" on public.orders;

create policy "Agents: update orders" on public.orders
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role = 'agent'
        and u.is_verified = true
    )
    and (
      -- Can update their OWN assigned orders (status changes)
      agent_id = auth.uid()
      -- OR can accept pending orders ONLY if also online
      or (
        status = 'pending'
        and exists (
          select 1 from public.users u2
          where u2.id = auth.uid() and u2.is_online = true
        )
      )
    )
  );

-- ── LEDGER: Allow agents to insert their own ledger entries ────
-- (needed for the delivered flow)
drop policy if exists "Agents: insert own ledger" on public.ledger;
create policy "Agents: insert own ledger" on public.ledger
  for insert with check (auth.uid() = agent_id);
