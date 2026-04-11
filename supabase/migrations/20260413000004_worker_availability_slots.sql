-- Phase 5 post-review: persist worker weekly availability.
--
-- The /my/availability page used to render purely client-side state seeded
-- from a hardcoded INITIAL_SLOTS set, so any slot the worker added was lost
-- on reload and never reached the DB. Adding a text[] column on
-- worker_profiles lets the new saveAvailability server action persist the
-- selection cheaply (≤ 168 entries per worker, one array cell).
--
-- Entries are strings of the form `${day}-${hour}`:
--   day:  mon | tue | wed | thu | fri | sat | sun
--   hour: 0..23 (24h clock, local time)
-- Example: ["mon-9", "mon-10", "wed-14", "fri-20"]
--
-- Idempotent ADD COLUMN IF NOT EXISTS so fresh deploys and reseeds converge.

ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS "availabilitySlots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
