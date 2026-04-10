-- Phase 2 · PostGIS extension for location-based queries
-- Applied via scripts/apply-supabase-migrations.ts (direct-prisma strategy)
-- Both idempotent via IF NOT EXISTS.

create extension if not exists postgis with schema extensions;
