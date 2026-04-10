-- Phase 3 Research Finding #4: Phase 2 PostGIS migration did NOT add a GIST index
-- on public.jobs.location. Without it, ST_DWithin becomes a full table scan.
-- This index is required for D-06 getJobsByDistance to be performant.

CREATE INDEX IF NOT EXISTS jobs_location_gist_idx
  ON public.jobs
  USING GIST (location);
