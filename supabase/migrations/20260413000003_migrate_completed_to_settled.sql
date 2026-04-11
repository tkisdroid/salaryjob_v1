-- Phase 5 D-03: Migrate legacy 'completed' applications to 'settled'.
--
-- Phase 4's checkOut Server Action wrote status='completed' for fully checked-out
-- applications. Phase 5 (Plan 05-04) flipped that to 'settled'. Without this
-- migration, any 'completed' rows that existed in dev/staging/prod before the
-- Phase 5 deploy would silently disappear from /my/settlements and /biz/settlements
-- because the new settlement queries (getWorkerSettlements, getBizSettlements,
-- getWorkerSettlementTotals, getBizSettlementTotals) filter on status='settled'.
--
-- Idempotent: only touches rows that have a non-null checkOutAt (i.e., the worker
-- actually completed checkout). Rows that are 'completed' for other historical
-- reasons stay as-is.

UPDATE public.applications
SET status = 'settled'
WHERE status = 'completed'
  AND "checkOutAt" IS NOT NULL;
