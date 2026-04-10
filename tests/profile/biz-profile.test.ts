import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  getBusinessProfilesByUserId,
  getBusinessProfileById,
} from "@/lib/db/queries";

// Track original values for restoration (seed isolation).
// Phase 2 seed provides business@dev.gignow.com (1 profile) and
// admin@dev.gignow.com (may hold multiple profiles per D-02 1:many).
const originalSnapshots = new Map<
  string,
  {
    name: string;
    category: string;
    logo: string | null;
    address: string;
    addressDetail: string | null;
    lat: unknown;
    lng: unknown;
    description: string | null;
  }
>();

afterAll(async () => {
  for (const [id, snap] of originalSnapshots.entries()) {
    await prisma.businessProfile.update({
      where: { id },
      data: {
        name: snap.name,
        category: snap.category as
          | "food"
          | "retail"
          | "logistics"
          | "office"
          | "event"
          | "cleaning"
          | "education"
          | "tech",
        logo: snap.logo,
        address: snap.address,
        addressDetail: snap.addressDetail,
        lat: snap.lat as unknown as number,
        lng: snap.lng as unknown as number,
        description: snap.description,
      },
    });
  }
  await prisma.$disconnect();
});

async function getBizUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: "business@dev.gignow.com" },
    select: { id: true },
  });
  if (!user) throw new Error("Phase 2 seed not present — run prisma/seed.ts");
  return user.id;
}

async function getAdminUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: "admin@dev.gignow.com" },
    select: { id: true },
  });
  if (!user) throw new Error("Phase 2 seed not present — run prisma/seed.ts");
  return user.id;
}

describe("Phase 3 — Business Profile CRUD (BIZ-01..03)", () => {
  describe("BIZ-01: name, category, logo, address, description round-trip", () => {
    it("persists all scalar fields via prisma.businessProfile.update", async () => {
      const userId = await getBizUserId();
      const profiles = await getBusinessProfilesByUserId(userId);
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      const target = profiles[0];

      originalSnapshots.set(target.id, {
        name: target.name,
        category: target.category,
        logo: target.logo,
        address: target.address,
        addressDetail: target.addressDetail,
        lat: target.lat,
        lng: target.lng,
        description: target.description,
      });

      await prisma.businessProfile.update({
        where: { id: target.id },
        data: {
          name: "테스트 사업장 이름",
          category: "food",
          logo: "🍜",
          address: "서울시 종로구 테스트로 1",
          description: "BIZ-01 round-trip 테스트 중",
        },
      });

      const reloaded = await getBusinessProfileById(target.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.name).toBe("테스트 사업장 이름");
      expect(reloaded!.category).toBe("food");
      expect(reloaded!.logo).toBe("🍜");
      expect(reloaded!.address).toBe("서울시 종로구 테스트로 1");
      expect(reloaded!.description).toBe("BIZ-01 round-trip 테스트 중");
    });
  });

  describe("BIZ-02: rating / reviewCount / completionRate / verified read-only exposure", () => {
    it("getBusinessProfilesByUserId returns numeric rating + integer counters + boolean verified", async () => {
      const userId = await getBizUserId();
      const profiles = await getBusinessProfilesByUserId(userId);
      expect(profiles.length).toBeGreaterThanOrEqual(1);
      const p = profiles[0];

      expect(Number(p.rating)).toBeGreaterThanOrEqual(0);
      expect(Number(p.rating)).toBeLessThanOrEqual(5);
      expect(typeof p.reviewCount).toBe("number");
      expect(p.reviewCount).toBeGreaterThanOrEqual(0);
      expect(typeof p.completionRate).toBe("number");
      expect(p.completionRate).toBeGreaterThanOrEqual(0);
      expect(p.completionRate).toBeLessThanOrEqual(100);
      expect(typeof p.verified).toBe("boolean");
    });
  });

  describe("BIZ-03: owner-only edit", () => {
    it("different users see only their own BusinessProfile rows", async () => {
      const bizId = await getBizUserId();
      const adminId = await getAdminUserId();

      const bizProfiles = await getBusinessProfilesByUserId(bizId);
      const adminProfiles = await getBusinessProfilesByUserId(adminId);

      expect(bizProfiles.length).toBeGreaterThanOrEqual(1);
      expect(adminProfiles.length).toBeGreaterThanOrEqual(1);

      for (const p of bizProfiles) expect(p.userId).toBe(bizId);
      for (const p of adminProfiles) expect(p.userId).toBe(adminId);

      const bizIds = new Set(bizProfiles.map((p) => p.id));
      const adminIds = new Set(adminProfiles.map((p) => p.id));
      for (const id of adminIds) expect(bizIds.has(id)).toBe(false);
    });

    it("updateBusinessProfile Server Action has owner check on session.id — static source scan", async () => {
      const fs = await import("node:fs/promises");
      const src = await fs.readFile(
        "src/app/biz/profile/actions.ts",
        "utf8",
      );
      expect(src).toContain("requireBusiness");
      expect(src).toMatch(/existing(\?)?\.userId\s*!==?\s*session\.id/);
      expect(src).not.toMatch(/formData\.get\(["']rating["']\)/);
      expect(src).not.toMatch(/formData\.get\(["']reviewCount["']\)/);
      expect(src).not.toMatch(/formData\.get\(["']completionRate["']\)/);
      expect(src).not.toMatch(/formData\.get\(["']verified["']\)/);
      expect(src).not.toMatch(/formData\.get\(["']userId["']\)/);
    });
  });

  describe("1:many relationship (Phase 2 D-02 schema fix)", () => {
    it("admin@dev.gignow.com has at least 1 business profile", async () => {
      const adminId = await getAdminUserId();
      const profiles = await getBusinessProfilesByUserId(adminId);
      expect(profiles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it.todo(
    "E2E: logged-in business user submits /biz/profile form and sees updated name",
  );
});
