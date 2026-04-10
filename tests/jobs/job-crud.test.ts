import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getJobsByBusinessIds,
  getJobById,
} from "@/lib/db/queries";
import { createTestJob, cleanupTestJobs } from "../helpers/test-jobs";

let biz1UserId: string;
let biz1BusinessProfileId: string;
let adminUserId: string;
let adminBusinessProfileId: string;

beforeAll(async () => {
  const biz1 = await prisma.user.findUnique({
    where: { email: "business@dev.gignow.com" },
    select: { id: true, businessProfiles: { select: { id: true } } },
  });
  if (!biz1 || biz1.businessProfiles.length === 0) {
    throw new Error(
      "Phase 2 seed not present (business@dev.gignow.com) — run prisma/seed.ts",
    );
  }
  biz1UserId = biz1.id;
  biz1BusinessProfileId = biz1.businessProfiles[0].id;

  const admin = await prisma.user.findUnique({
    where: { email: "admin@dev.gignow.com" },
    select: { id: true, businessProfiles: { select: { id: true } } },
  });
  if (!admin || admin.businessProfiles.length === 0) {
    throw new Error(
      "Phase 2 seed not present (admin@dev.gignow.com) — run prisma/seed.ts",
    );
  }
  adminUserId = admin.id;
  adminBusinessProfileId = admin.businessProfiles[0].id;
});

afterAll(async () => {
  await cleanupTestJobs();
  await prisma.$disconnect();
});

describe("Phase 3 — Job CRUD (POST-01..03)", () => {
  describe("POST-01: createJob persists full payload", () => {
    it("stores all Phase 3 scalar and array fields", async () => {
      const job = await createTestJob({
        authorId: biz1UserId,
        businessId: biz1BusinessProfileId,
        title: "TEST_POST01_full_payload",
        category: "food",
      });

      // Update the row to set the Phase 3 structured fields (createTestJob
      // defaults them to empty arrays).
      await prisma.job.update({
        where: { id: job.id },
        data: {
          duties: ["서빙", "주문 받기"],
          requirements: ["한국어 가능", "주말 근무 가능"],
          dressCode: "편한 운동화",
          whatToBring: ["신분증", "앞치마"],
          tags: ["초보환영", "식사제공"],
          address: "서울시 강남구 테스트로 1",
          addressDetail: "2층",
        },
      });

      const reloaded = await getJobById(job.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.title).toBe("TEST_POST01_full_payload");
      expect(reloaded!.category).toBe("food");
      expect(reloaded!.duties).toEqual(["서빙", "주문 받기"]);
      expect(reloaded!.requirements).toEqual([
        "한국어 가능",
        "주말 근무 가능",
      ]);
      expect(reloaded!.dressCode).toBe("편한 운동화");
      expect(reloaded!.whatToBring).toEqual(["신분증", "앞치마"]);
      expect(reloaded!.tags).toEqual(["초보환영", "식사제공"]);
    });

    it("workDate + startTime + endTime are readable via adapter", async () => {
      const job = await createTestJob({
        authorId: biz1UserId,
        businessId: biz1BusinessProfileId,
        title: "TEST_POST01_date_time",
        workDate: new Date("2026-05-15"),
        startTime: "09:00",
        endTime: "17:00",
      });
      const reloaded = await getJobById(job.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.workDate).toBe("2026-05-15");
      expect(reloaded!.startTime).toBe("09:00");
      expect(reloaded!.endTime).toBe("17:00");
    });
  });

  describe("POST-02: getJobsByBusinessIds returns owner's jobs only", () => {
    it("returns jobs matching the given business ids", async () => {
      const biz1Job = await createTestJob({
        authorId: biz1UserId,
        businessId: biz1BusinessProfileId,
        title: "TEST_POST02_biz1",
      });
      const adminJob = await createTestJob({
        authorId: adminUserId,
        businessId: adminBusinessProfileId,
        title: "TEST_POST02_admin",
      });

      const biz1Jobs = await getJobsByBusinessIds([biz1BusinessProfileId]);
      const adminJobs = await getJobsByBusinessIds([adminBusinessProfileId]);

      expect(biz1Jobs.some((j) => j.id === biz1Job.id)).toBe(true);
      expect(biz1Jobs.some((j) => j.id === adminJob.id)).toBe(false);
      expect(adminJobs.some((j) => j.id === adminJob.id)).toBe(true);
      expect(adminJobs.some((j) => j.id === biz1Job.id)).toBe(false);
    });

    it("returns empty array when given empty business id list", async () => {
      const result = await getJobsByBusinessIds([]);
      expect(result).toEqual([]);
    });
  });

  describe("POST-03: update/delete ownership enforcement at code level", () => {
    it("actions.ts updateJob has owner check with session.id", async () => {
      const fs = await import("node:fs/promises");
      const src = await fs.readFile(
        "src/app/biz/posts/actions.ts",
        "utf8",
      );
      expect(src).toContain("requireBusiness");
      // Owner check pattern — match any of the common forms
      expect(src).toMatch(/existing(\?)?\.authorId\s*!==?\s*session\.id/);
      // Ensure authorId is NEVER read from FormData
      expect(src).not.toMatch(/formData\.get\(["']authorId["']\)/);
      // Ensure workHours is NOT read from FormData (server-computed)
      expect(src).not.toMatch(/formData\.get\(["']workHours["']\)/);
    });

    it("actions.ts deleteJob has owner check", async () => {
      const fs = await import("node:fs/promises");
      const src = await fs.readFile(
        "src/app/biz/posts/actions.ts",
        "utf8",
      );
      // Locate the deleteJob function and ensure it contains the owner check
      const deleteSlice = src.slice(src.indexOf("async function deleteJob"));
      expect(deleteSlice).toMatch(
        /existing(\?)?\.authorId\s*!==?\s*session\.id/,
      );
    });

    it("deleteJob via Prisma actually removes the row (unit level)", async () => {
      const job = await createTestJob({
        authorId: biz1UserId,
        businessId: biz1BusinessProfileId,
        title: "TEST_POST03_delete",
      });

      // Simulate the owner check + delete manually (no session context here)
      const existing = await prisma.job.findUnique({
        where: { id: job.id },
        select: { authorId: true },
      });
      expect(existing?.authorId).toBe(biz1UserId);

      await prisma.job.delete({ where: { id: job.id } });

      const reloaded = await getJobById(job.id);
      expect(reloaded).toBeNull();
    });
  });

  // Real Server Action invocation with auth cookies is Playwright territory.
  it.todo(
    "E2E: logged-in business user POSTs /biz/posts/new form and is redirected to /biz/posts/[id]",
  );
  it.todo(
    "E2E: logged-in business user clicks Delete on /biz/posts/[id] and is redirected to /biz/posts",
  );
});
