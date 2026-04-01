-- ════════════════════════════════════════════════════════════════
-- DASHR — Storage Policies for ID Cards
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. Ensure the id-cards bucket exists
insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', true)
on conflict (id) do nothing;

-- 2. Storage objects usually have RLS enabled by default in Supabase.
-- Attempting to alter it as a regular user throws a permissions error.

-- 3. Policy: Authenticated users can upload their own ID cards
-- The folder name MUST match their user ID
create policy "Users can upload their own ID cards"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'id-cards' and (auth.uid()::text = (storage.foldername(name))[1])
);

-- 4. Policy: Authenticated users can update their own ID cards
create policy "Users can update their own ID cards"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'id-cards' and (auth.uid()::text = (storage.foldername(name))[1])
);

-- 5. Policy: Public can view ID cards (since the bucket is public)
create policy "Public can view ID cards"
on storage.objects
for select
to public
using ( bucket_id = 'id-cards' );
