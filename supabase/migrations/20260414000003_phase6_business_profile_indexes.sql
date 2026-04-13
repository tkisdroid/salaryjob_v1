-- Phase 6 D-43 (perf): Indexes on business_profiles for admin search queries.
--
-- businessRegNumber: supports ILIKE search on biz reg number (D-40)
-- ownerPhone: supports ILIKE digit-only search on owner phone (D-40)
--
-- Research Q3: skip trigram GIN index for MVP — sequential ILIKE scan is
-- acceptable at <10k rows. Revisit in v2 if admin list shows slowness.

BEGIN;
CREATE INDEX IF NOT EXISTS ix_bp_reg_number  ON public.business_profiles("businessRegNumber");
CREATE INDEX IF NOT EXISTS ix_bp_owner_phone ON public.business_profiles("ownerPhone");
COMMIT;
