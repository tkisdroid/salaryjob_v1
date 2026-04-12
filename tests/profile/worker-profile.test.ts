import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getWorkerProfileByUserId } from "@/lib/db/queries";

// Seeded worker account from Phase 2 (02-05-SUMMARY)
// Email: worker@dev.gignow.com → has User + WorkerProfile (kim-jihoon)
// We look it up by email rather than hardcode UUID so tests survive re-seeding.

async function getSeedWorkerUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: "worker@dev.gignow.com" },
    select: { id: true },
  });
  if (!user) throw new Error("Phase 2 seed not present — run prisma/seed.ts");
  return user.id;
}

// Track any profiles we create so we can clean them up (without touching seed)
const createdProfileIds: string[] = [];

afterAll(async () => {
  // We only clean up profiles we created — the Phase 2 seed worker profile stays
  if (createdProfileIds.length > 0) {
    await prisma.workerProfile.deleteMany({
      where: { id: { in: createdProfileIds } },
    });
  }
  await prisma.$disconnect();
});

describe("Phase 3 — Worker Profile CRUD (WORK-01..04)", () => {
  describe("WORK-01 + WORK-02: name, nickname, bio, preferredCategories", () => {
    it("persists all fields via prisma.workerProfile.update", async () => {
      const userId = await getSeedWorkerUserId();

      // Capture the original values so we can restore them (seed isolation)
      const original = await getWorkerProfileByUserId(userId);
      if (!original) throw new Error("Seed worker profile missing");

      try {
        await prisma.workerProfile.update({
          where: { userId },
          data: {
            name: "테스트 김지훈",
            nickname: "testnick",
            birthDate: new Date("1998-07-15T00:00:00.000Z"),
            bio: "테스트 소개글입니다",
            preferredCategories: ["food", "retail", "logistics"],
          },
        });

        const reloaded = await getWorkerProfileByUserId(userId);
        expect(reloaded).not.toBeNull();
        expect(reloaded!.name).toBe("테스트 김지훈");
        expect(reloaded!.nickname).toBe("testnick");
        expect(new Date(reloaded!.birthDate!).toISOString().slice(0, 10)).toBe(
          "1998-07-15",
        );
        expect(reloaded!.bio).toBe("테스트 소개글입니다");
        expect(reloaded!.preferredCategories).toEqual(
          expect.arrayContaining(["food", "retail", "logistics"]),
        );
        expect(reloaded!.preferredCategories).toHaveLength(3);
      } finally {
        // Restore original values so subsequent tests and manual inspection see the seed
        await prisma.workerProfile.update({
          where: { userId },
          data: {
            name: original.name,
            nickname: original.nickname,
            birthDate: original.birthDate,
            bio: original.bio,
            preferredCategories: original.preferredCategories,
          },
        });
      }
    });
  });

  describe("WORK-03: read-only fields (badgeLevel, rating, totalJobs, completionRate)", () => {
    it("getWorkerProfileByUserId returns badge/rating/totalJobs/completionRate from DB", async () => {
      const userId = await getSeedWorkerUserId();
      const profile = await getWorkerProfileByUserId(userId);
      expect(profile).not.toBeNull();
      expect(typeof profile!.badgeLevel).toBe("string");
      expect(profile!.badgeLevel).toMatch(
        /^(newbie|bronze|silver|gold|platinum|diamond)$/,
      );
      expect(profile!.totalJobs).toBeGreaterThanOrEqual(0);
      expect(profile!.completionRate).toBeGreaterThanOrEqual(0);
      expect(profile!.completionRate).toBeLessThanOrEqual(100);
      // rating is Prisma Decimal → convert to number
      expect(Number(profile!.rating)).toBeGreaterThanOrEqual(0);
      expect(Number(profile!.rating)).toBeLessThanOrEqual(5);
    });
  });

  describe("WORK-04: owner-only update (DAL enforcement at the code level)", () => {
    it("getWorkerProfileByUserId with a different userId returns that user's profile only", async () => {
      const workerUserId = await getSeedWorkerUserId();
      const fakeOtherUserId = "00000000-0000-0000-0000-000000000000";

      const a = await getWorkerProfileByUserId(workerUserId);
      const b = await getWorkerProfileByUserId(fakeOtherUserId);

      expect(a).not.toBeNull();
      expect(b).toBeNull();
      expect(a!.userId).toBe(workerUserId);
    });

    it("updateWorkerProfile Server Action uses session.id — verified by static check", async () => {
      // The Server Action's owner enforcement is: const session = await requireWorker()
      // then prisma.workerProfile.upsert({ where: { userId: session.id } })
      // This is a CODE-LEVEL assertion we can verify via file contents.
      const fs = await import("node:fs/promises");
      const src = await fs.readFile(
        "src/app/(worker)/my/profile/edit/actions.ts",
        "utf8",
      );
      expect(src).toContain("requireWorker");
      expect(src).toContain("session.id");
      // No FormData read for userId — owner cannot be spoofed
      expect(src).not.toMatch(/formData\.get\(["']userId["']\)/);
    });
  });

  // E2E: real auth cookies + server action invocation is Playwright territory.
  // Phase 3 UAT will do the browser-level flow.
  it.todo(
    "E2E: logged-in worker can POST /my/profile/edit form and see name updated on /my",
  );
});
