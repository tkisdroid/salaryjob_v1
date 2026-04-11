-- Phase 5 D-01: Schema extensions for reviews + settlements.
--
-- 1. ApplicationStatus.settled — new terminal state for checked-out applications.
--    Replaces the legacy 'completed' value for new rows; 'completed' is kept for
--    historical rows until the legacy migration in 20260413000003 moves them.
--
-- 2. WorkerProfile.reviewCount — required by biz→worker rating aggregation in
--    src/app/biz/posts/[id]/applicants/[applicantId]/review/actions.ts. Matches
--    the same-named column on BusinessProfile.
--
-- Both changes were applied imperatively to the dev Supabase instance during
-- Plan 05-02 execution. This migration captures them so fresh deployments
-- (staging, prod, new contributors) get the same schema without drift.

-- 1. Add 'settled' to ApplicationStatus enum.
-- ALTER TYPE ... ADD VALUE is not transactional and cannot be undone by ROLLBACK,
-- so we guard with IF NOT EXISTS for idempotency.
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'settled';

-- 2. Add reviewCount column to worker_profiles.
-- Defaults to 0 for existing rows so biz→worker rating aggregation
-- (ROUND(((rating * reviewCount) + new) / (reviewCount + 1), 2)) divides by 1
-- on the first review.
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
