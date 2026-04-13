-- Phase 6 D-37/D-33: Schema extensions for admin backoffice + commission snapshot.
--
-- 1. BusinessProfile — 6 new columns:
--    - businessRegNumber VARCHAR(10): digits-only 10-char Korean biz reg number
--    - ownerName TEXT: 대표자명 (nullable, different from signup user)
--    - ownerPhone VARCHAR(20): 대표자 연락처 (separate from auth.users phone)
--    - businessRegImageUrl TEXT: storage path within business-reg-docs bucket (not full URL)
--    - commissionRate DECIMAL(5,2): override rate as percentage (5.00 = 5%). NULL → use env default
--    - regNumberOcrMismatched BOOLEAN NOT NULL DEFAULT false: D-33 admin-review flag.
--      TRUE when CLOVA OCR extracted a regNumber that did not match stored businessRegNumber.
--      Written by /biz/verify upload flow (Plan 06-06). Default false so Wave 4 admin list
--      queries (Plan 06-05) can safely filter/display without checking for NULL.
--
-- 2. Application — 3 new nullable columns (Option A per research §7):
--    - commissionRate DECIMAL(5,2): snapshot of effective rate at checkOut time (never mutated)
--    - commissionAmount INTEGER: KRW commission, rounded half-up
--    - netEarnings INTEGER: gross (earnings) - commissionAmount
--    Old settled rows get all three NULL — UI reads commissionAmount ?? 0.

BEGIN;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS "businessRegNumber"       VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "ownerName"               TEXT,
  ADD COLUMN IF NOT EXISTS "ownerPhone"              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "businessRegImageUrl"     TEXT,
  ADD COLUMN IF NOT EXISTS "commissionRate"          DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "regNumberOcrMismatched"  BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS "commissionRate"      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "commissionAmount"    INTEGER,
  ADD COLUMN IF NOT EXISTS "netEarnings"         INTEGER;

-- commissionRate stored as percentage (5.00 = 5%), NOT fraction.
-- Default rate falls back to env PLATFORM_DEFAULT_COMMISSION_RATE or '0'.
COMMENT ON COLUMN public.business_profiles."commissionRate" IS
  'Override commission rate as percentage (5.00 = 5%). NULL means use PLATFORM_DEFAULT_COMMISSION_RATE env (fallback "0").';
COMMENT ON COLUMN public.business_profiles."regNumberOcrMismatched" IS
  'D-33 admin-review flag. TRUE when CLOVA OCR extracted a regNumber that did not match the stored businessRegNumber. Written by /biz/verify upload flow. Default false so Wave 4 admin queries can safely filter/display.';
COMMENT ON COLUMN public.applications."commissionRate" IS
  'Snapshot of effective commission rate at checkOut time. Never mutated after settlement.';

COMMIT;
