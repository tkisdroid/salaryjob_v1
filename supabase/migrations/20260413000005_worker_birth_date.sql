ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS "birthDate" date;
