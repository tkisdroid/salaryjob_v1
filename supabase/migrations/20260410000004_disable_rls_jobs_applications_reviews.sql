-- Phase 2 · D-05: Explicitly disable RLS on jobs, applications, reviews
-- Per CONTEXT.md D-05: these tables remain RLS-disabled until Phase 3/4/5
-- Supabase enables RLS on all tables by default for new projects — override here.

alter table public.jobs disable row level security;
alter table public.applications disable row level security;
alter table public.reviews disable row level security;
