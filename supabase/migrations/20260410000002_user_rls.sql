-- Phase 2 · User table row-level security (own-row only)

alter table public.users enable row level security;

-- Read own row
create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);

-- Update own row (email/phone via auth.updateUser; role via admin.updateUserById only)
create policy "users_update_own"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy: trigger handle_new_user runs as security definer, bypasses RLS
-- No delete policy: account deletion is an admin operation (service_role)
