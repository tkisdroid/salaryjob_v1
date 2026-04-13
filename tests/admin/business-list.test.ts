// Wave 0 RED tests — D-40..D-43 Admin business list: search, filter, sort, pagination
//
// INTENTIONALLY SKIPPED until Wave 5 (Plan 06-05) implements getBusinessesPaginated.
//
// Flip to GREEN: Plan 06-05 (Wave 5) must implement:
//   src/lib/db/admin-queries.ts — getBusinessesPaginated(args) following the
//   interface spec in 06-01-PLAN.md <interfaces> block.
//
// To flip: change describe.skip → describe.skipIf(!process.env.DATABASE_URL)
// in this file once Plan 06-05 Task 1 ships admin-queries.ts.

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createTestAdmin,
  createTestBusinessWithReg,
  cleanupPhase6Fixtures,
} from "../fixtures/phase6";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skip(
  // TODO(wave-5): flip describe.skip → describe.skipIf(!process.env.DATABASE_URL)
  // once Plan 06-05 ships getBusinessesPaginated at src/lib/db/admin-queries.ts
  "D-40..43: Admin business list — search / filter / sort / cursor pagination",
  () => {
    // Import lazily so test collection doesn't fail pre-Wave 5
    // (admin-queries.ts doesn't exist yet)
    // @ts-expect-error wave-5-not-yet-implemented
    let getBusinessesPaginated: typeof import("@/lib/db/admin-queries").getBusinessesPaginated;

    const adminIds: string[] = [];

    beforeAll(async () => {
      await cleanupPhase6Fixtures();

      // @ts-expect-error wave-5-not-yet-implemented
      const module = await import("@/lib/db/admin-queries");
      getBusinessesPaginated = module.getBusinessesPaginated;
    });

    afterAll(async () => {
      await cleanupPhase6Fixtures();
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      await cleanupPhase6Fixtures();
      adminIds.length = 0;
    });

    // -----------------------------------------------------------------------
    // Seed helper: create N business profiles with varied attributes
    // -----------------------------------------------------------------------

    async function seedBusinesses() {
      const configs = [
        { name: "fixture-alpha 삼겹살집", regNumber: "1234567890", ownerName: "홍길동", ownerPhone: "01011112222", commissionRate: "5.00", verified: true },
        { name: "fixture-beta 편의점", regNumber: "2345678901", ownerName: "김철수", ownerPhone: "01022223333", commissionRate: "3.00", verified: true },
        { name: "fixture-gamma 카페", regNumber: "3456789012", ownerName: "이영희", ownerPhone: "01033334444", commissionRate: null, verified: false },
        { name: "fixture-delta 물류창고", regNumber: "4567890123", ownerName: "박민준", ownerPhone: "01044445555", commissionRate: "10.00", verified: false },
        { name: "fixture-epsilon 호텔", regNumber: "5678901234", ownerName: "최수진", ownerPhone: "01055556666", commissionRate: "7.50", verified: true },
      ];

      const ids: string[] = [];
      for (const cfg of configs) {
        const { id: userId } = await createTestAdmin({ email: `admin-seed-${Date.now()}-${Math.random()}@test.local` });
        adminIds.push(userId);
        const { id: bizId } = await createTestBusinessWithReg({
          userId,
          name: cfg.name,
          regNumber: cfg.regNumber,
          ownerName: cfg.ownerName,
          ownerPhone: cfg.ownerPhone,
          commissionRate: cfg.commissionRate,
          verified: cfg.verified,
        });
        ids.push(bizId);
      }
      return ids;
    }

    // -----------------------------------------------------------------------
    // D-42 sort tests
    // -----------------------------------------------------------------------

    it("D-42: sort='created_desc' → returns newest first", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({ sort: "created_desc" });
      expect(result.items.length).toBeGreaterThanOrEqual(5);
      // Verify descending order by checking consecutive pairs
      for (let i = 0; i < result.items.length - 1; i++) {
        const a = new Date(result.items[i].createdAt);
        const b = new Date(result.items[i + 1].createdAt);
        expect(a.getTime()).toBeGreaterThanOrEqual(b.getTime());
      }
    });

    it("D-42: sort='created_asc' → returns oldest first", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({ sort: "created_asc" });
      expect(result.items.length).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < result.items.length - 1; i++) {
        const a = new Date(result.items[i].createdAt);
        const b = new Date(result.items[i + 1].createdAt);
        expect(a.getTime()).toBeLessThanOrEqual(b.getTime());
      }
    });

    it("D-42: sort='rate_desc' → nulls appear last or first consistently (explicit)", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({ sort: "rate_desc" });
      expect(result.items.length).toBeGreaterThanOrEqual(5);
      // Find null-rate rows — they must all be grouped together (either all at start or all at end)
      const nullIndices = result.items
        .map((item, idx) => (item.commissionRate == null ? idx : -1))
        .filter((i) => i !== -1);
      if (nullIndices.length > 0) {
        // All nulls must be contiguous at one end (implementation decides which)
        const maxNullIdx = Math.max(...nullIndices);
        const minNullIdx = Math.min(...nullIndices);
        // They must be consecutive — no non-null between first and last null
        expect(maxNullIdx - minNullIdx).toBe(nullIndices.length - 1);
      }
    });

    // -----------------------------------------------------------------------
    // D-40 search tests
    // -----------------------------------------------------------------------

    it("D-40: q='fixture-alpha', field='name' → ILIKE matches only that business", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        q: "fixture-alpha",
        field: "name",
        sort: "created_desc",
      });
      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toMatch(/fixture-alpha/i);
    });

    it("D-40: q='123-45', field='reg' → dash-normalized match against digit-only storage", async () => {
      await seedBusinesses();
      // '123-45' with dashes should match '1234567890' stored digit-only
      const result = await getBusinessesPaginated({
        q: "123-45",
        field: "reg",
        sort: "created_desc",
      });
      // Should find the business with regNumber='1234567890'
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      const found = result.items.find((item) =>
        item.businessRegNumber?.startsWith("12345"),
      );
      expect(found).toBeDefined();
    });

    it("D-40: q='홍길동', field='owner' → ILIKE matches ownerName", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        q: "홍길동",
        field: "owner",
        sort: "created_desc",
      });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].ownerName).toBe("홍길동");
    });

    it("D-40: q='01011', field='phone' → ILIKE matches ownerPhone", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        q: "01011",
        field: "phone",
        sort: "created_desc",
      });
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].ownerPhone).toMatch(/01011/);
    });

    // -----------------------------------------------------------------------
    // D-41 verified filter tests
    // -----------------------------------------------------------------------

    it("D-41: verified='yes' → only verified=true rows", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        verified: "yes",
        sort: "created_desc",
      });
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.verified).toBe(true);
      }
    });

    it("D-41: verified='no' → only verified=false rows", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        verified: "no",
        sort: "created_desc",
      });
      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.verified).toBe(false);
      }
    });

    it("D-41: verified='all' → both verified and unverified rows", async () => {
      await seedBusinesses();
      const result = await getBusinessesPaginated({
        verified: "all",
        sort: "created_desc",
      });
      const hasVerified = result.items.some((i) => i.verified === true);
      const hasUnverified = result.items.some((i) => i.verified === false);
      expect(hasVerified).toBe(true);
      expect(hasUnverified).toBe(true);
    });

    // -----------------------------------------------------------------------
    // D-43 cursor pagination tests
    // -----------------------------------------------------------------------

    it("D-43: limit=2 returns 2 items and a nextCursor; second call returns next 2 distinct items", async () => {
      await seedBusinesses();
      const page1 = await getBusinessesPaginated({
        sort: "created_desc",
        limit: 2,
      });
      expect(page1.items.length).toBe(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await getBusinessesPaginated({
        sort: "created_desc",
        limit: 2,
        cursor: page1.nextCursor,
      });
      expect(page2.items.length).toBeGreaterThan(0);

      // No overlap between pages
      const ids1 = new Set(page1.items.map((i) => i.id));
      for (const item of page2.items) {
        expect(ids1.has(item.id)).toBe(false);
      }
    });

    it("D-43: last page has nextCursor=null", async () => {
      await seedBusinesses();
      // Fetch all 5 at once — nextCursor should be null
      const result = await getBusinessesPaginated({
        sort: "created_desc",
        limit: 20,
      });
      // With only 5 fixture rows, a limit-20 fetch should exhaust
      expect(result.nextCursor).toBeNull();
    });
  },
);
