import { describe, it } from "vitest";

describe.skip("Phase 3 — Job expiry automation (POST-06)", () => {
  describe("D-04: pg_cron schedule", () => {
    it.todo("cron.job has a row with jobname='expire-jobs-every-5-min' and schedule='*/5 * * * *'");
    it.todo("cron.job.command contains UPDATE public.jobs SET status = 'expired'");
  });

  describe("D-04: lazy filter in queries.ts", () => {
    it.todo("getJobsPaginated excludes jobs where workDate+startTime < now() (lazy filter)");
    it.todo("getJobsByDistance also applies the lazy filter");
    it.todo("running the pg_cron UPDATE body inline against a past-dated test job sets its status to 'expired'");
  });
});
