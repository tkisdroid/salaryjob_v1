-- Owner-phone SMS OTP verification
-- See src/lib/otp/owner-phone.ts and src/lib/sms/aligo.ts for runtime usage.

-- 1. BusinessProfile: track when owner phone was SMS-verified.
--    NULL = unverified; non-null = UTC timestamp of last successful verify.
ALTER TABLE "public"."business_profiles"
  ADD COLUMN IF NOT EXISTS "ownerPhoneVerifiedAt" TIMESTAMP(3);

-- 2. OTP audit table. Codes are stored as sha256(code) hex only; plaintext
--    is never persisted. Cascade delete follows business_profiles.
CREATE TABLE IF NOT EXISTS "public"."owner_phone_otps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "businessProfileId" UUID NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "owner_phone_otps_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."owner_phone_otps"
  ADD CONSTRAINT "owner_phone_otps_businessProfileId_fkey"
  FOREIGN KEY ("businessProfileId")
  REFERENCES "public"."business_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "owner_phone_otps_businessProfileId_idx"
  ON "public"."owner_phone_otps" ("businessProfileId");

CREATE INDEX IF NOT EXISTS "owner_phone_otps_phone_idx"
  ON "public"."owner_phone_otps" ("phone");
