-- Phase 2 · Auto-create public.users row when auth.users row inserted
-- Applied AFTER prisma db push (needs public.users table to exist)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, phone, role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      (new.raw_app_meta_data ->> 'role')::public."UserRole",
      'WORKER'::public."UserRole"
    ),
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
