-- Phase 2 · Profile tables RLS (own ALL, others SELECT)

-- Worker profiles
alter table public.worker_profiles enable row level security;

create policy "worker_profiles_select_all"
  on public.worker_profiles
  for select
  using (true);  -- All authenticated users can browse worker profiles (Phase 3 public listing)

create policy "worker_profiles_insert_own"
  on public.worker_profiles
  for insert
  with check (auth.uid() = "userId");

create policy "worker_profiles_update_own"
  on public.worker_profiles
  for update
  using (auth.uid() = "userId")
  with check (auth.uid() = "userId");

create policy "worker_profiles_delete_own"
  on public.worker_profiles
  for delete
  using (auth.uid() = "userId");

-- Business profiles
alter table public.business_profiles enable row level security;

create policy "business_profiles_select_all"
  on public.business_profiles
  for select
  using (true);

create policy "business_profiles_insert_own"
  on public.business_profiles
  for insert
  with check (auth.uid() = "userId");

create policy "business_profiles_update_own"
  on public.business_profiles
  for update
  using (auth.uid() = "userId")
  with check (auth.uid() = "userId");

create policy "business_profiles_delete_own"
  on public.business_profiles
  for delete
  using (auth.uid() = "userId");

-- Phase 2 explicitly does NOT enable RLS on jobs, applications, reviews
-- These tables remain RLS-disabled until Phase 3/4/5 (see D-05)
