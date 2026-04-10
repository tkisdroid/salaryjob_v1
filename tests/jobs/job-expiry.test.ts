import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getJobsPaginated } from "@/lib/db/queries";
import { createTestJob } from "../helpers/test-jobs";

let biz1UserId: string;
let biz1BusinessProfileId: string;

// Unique per-file prefix — prevents other parallel suites from wiping our rows.
const PREFIX = "TEST_POST06_";
const createdIds: string[] = [];

beforeAll(async () => {
  const biz1 = await prisma.user.findUnique({
    where: { email: "business@dev.gignow.com" },
    select: { id: true, businessProfiles: { select: { id: true } } },
  });
  if (!biz1 || biz1.businessProfiles.length === 0) {
    throw new Error(
      "Phase 2 seed not present — expected business@dev.gignow.com",
    );
  }
  biz1UserId = biz1.id;
  biz1BusinessProfileId = biz1.businessProfiles[0].id;
});

afterAll(async () => {
  if (createdIds.length > 0) {
    await prisma.job.deleteMany({ where: { id: { in: createdIds } } });
  }
  await prisma.$disconnect();
});

async function mkJob(input: {
  title: string;
  workDate?: Date;
  startTime?: string;
  endTime?: string;
}) {
  const job = await createTestJob({
    authorId: biz1UserId,
    businessId: biz1BusinessProfileId,
    title: `${PREFIX}${input.title}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  createdIds.push(job.id);
  return job;
}

describe("Phase 3 — Job expiry automation (POST-06 + D-04)", () => {
  describe("pg_cron schedule", () => {
    it("cron.job has expire-jobs-every-5-min with '*/5 * * * *' schedule", async () => {
      const rows = await prisma.$queryRaw<
        {
          jobname: string;
          schedule: string;
          active: boolean;
          command: string;
        }[]
      >`
        SELECT jobname, schedule, active, command
        FROM cron.job
        WHERE jobname = 'expire-jobs-every-5-min'
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].schedule).toBe("*/5 * * * *");
      expect(rows[0].active).toBe(true);
      expect(rows[0].command).toContain("status = 'expired'");
      expect(rows[0].command).toContain("public.jobs");
    });
  });

  describe("lazy filter in getJobsPaginated", () => {
    it("excludes a past-dated test job even though status is still 'active'", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pastJob = await mkJob({
        title: "past_job",
        workDate: yesterday,
        startTime: "09:00",
        endTime: "17:00",
      });

      // DB row is still marked active — cron hasn't necessarily run yet
      const raw = await prisma.job.findUnique({
        where: { id: pastJob.id },
        select: { id: true, status: true, workDate: true },
      });
      expect(raw?.status).toBe("active");

      // But getJobsPaginated's lazy filter must hide it anyway
      const { jobs } = await getJobsPaginated({ limit: 200 });
      const found = jobs.find((j) => j.id === pastJob.id);
      expect(found).toBeUndefined();
    });

    it("includes a future-dated test job", async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const futureJob = await mkJob({
        title: "future_job",
        workDate: tomorrow,
        startTime: "09:00",
        endTime: "17:00",
      });

      const { jobs } = await getJobsPaginated({ limit: 200 });
      const found = jobs.find((j) => j.id === futureJob.id);
      expect(found).toBeDefined();
    });
  });

  describe("pg_cron SQL body — inline execution", () => {
    it("running the cron UPDATE body inline sets a past test job to 'expired'", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const pastJob = await mkJob({
        title: "cron_inline",
        workDate: twoDaysAgo,
        startTime: "09:00",
        endTime: "17:00",
      });

      // Same UPDATE body as supabase/migrations/20260411000003_pg_cron_expire_jobs.sql
      await prisma.$executeRaw`
        UPDATE public.jobs
        SET status = 'expired'
        WHERE id = ${pastJob.id}::uuid
          AND status = 'active'
          AND (
            "workDate"::timestamp + CAST("startTime" AS time)
          )::timestamptz < now() - INTERVAL '5 minutes';
      `;

      const after = await prisma.job.findUnique({
        where: { id: pastJob.id },
        select: { status: true },
      });
      expect(after?.status).toBe("expired");
    });
  });
});
