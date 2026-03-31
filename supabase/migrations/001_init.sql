-- ════════════════════════════════════════════════════════════════
-- DASHR — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS ───────────────────────────────────────────────────────
create table public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text,
  phone            text,
  email            text,
  role             text not null default 'customer' check (role in ('customer', 'agent', 'admin')),
  srm_id           text,
  id_card_url      text,
  is_verified      boolean not null default false,
  rating           numeric(3,2) not null default 5.00,
  total_deliveries integer not null default 0,
  strikes          integer not null default 0,
  is_online        boolean not null default false,
  blocked_id_hash  text,
  created_at       timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can read/update their own profile
create policy "Users: read own" on public.users
  for select using (auth.uid() = id);

create policy "Users: update own" on public.users
  for update using (auth.uid() = id);

create policy "Users: insert own" on public.users
  for insert with check (auth.uid() = id);

-- Agents can see other users (for order context, limited fields)
create policy "Agents: read all users" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('agent','admin'))
  );

-- Admin: full access
create policy "Admin: full users" on public.users
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ── ORDERS ──────────────────────────────────────────────────────
create type order_zone   as enum ('on_campus', 'shiv_temple', 'off_campus');
create type order_status as enum ('pending', 'assigned', 'picked_up', 'delivered', 'cancelled');
create type payment_type as enum ('agent_float', 'upi_on_delivery');

create table public.orders (
  id                uuid primary key default uuid_generate_v4(),
  customer_id       uuid not null references public.users(id) on delete cascade,
  agent_id          uuid references public.users(id) on delete set null,
  item_description  text not null,
  pickup_location   text not null,
  pickup_zone       order_zone not null,
  delivery_hostel   text not null,
  delivery_room     text not null,
  order_value       integer not null check (order_value > 0),
  commission_amount integer not null,
  min_commission    integer not null,
  payment_method    payment_type not null,
  status            order_status not null default 'pending',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Customers see own orders
create policy "Customers: read own orders" on public.orders
  for select using (auth.uid() = customer_id);

-- Customers can create orders
create policy "Customers: insert orders" on public.orders
  for insert with check (auth.uid() = customer_id);

-- Agents see all pending orders (for feed)
create policy "Agents: read pending orders" on public.orders
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'agent' and u.is_verified = true and u.is_online = true
    )
  );

-- Agents can update orders they own or pending orders (to accept)
create policy "Agents: update orders" on public.orders
  for update using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'agent' and u.is_verified = true
    )
    and (agent_id = auth.uid() or status = 'pending')
  );

-- Admin: full access
create policy "Admin: full orders" on public.orders
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- ── LEDGER ──────────────────────────────────────────────────────
create type ledger_type as enum ('commission', 'reimbursement');

create table public.ledger (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references public.users(id) on delete cascade,
  order_id   uuid not null references public.orders(id) on delete cascade,
  type       ledger_type not null,
  amount     integer not null,
  week_start date not null,
  is_paid    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ledger enable row level security;

create policy "Agents: read own ledger" on public.ledger
  for select using (auth.uid() = agent_id);

create policy "Admin: full ledger" on public.ledger
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ── STRIKES ─────────────────────────────────────────────────────
create table public.strikes (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references public.users(id) on delete cascade,
  order_id   uuid references public.orders(id) on delete set null,
  reason     text not null,
  created_at timestamptz not null default now()
);

alter table public.strikes enable row level security;

create policy "Admin: full strikes" on public.strikes
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "Agents: read own strikes" on public.strikes
  for select using (auth.uid() = agent_id);

-- ── REALTIME PUBLICATION ────────────────────────────────────────
-- Enable realtime for orders table (for live feed + status tracking)
alter publication supabase_realtime add table public.orders;

-- ── STORAGE BUCKET FOR ID CARDS ─────────────────────────────────
-- Run this manually in Supabase Storage UI or via API:
-- Create a bucket named 'id-cards' with private access
-- insert into storage.buckets (id, name, public) values ('id-cards', 'id-cards', false);
