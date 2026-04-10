import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getJobsByDistance } from "@/lib/db/queries";
import { createTestJob, setJobLocation } from "../helpers/test-jobs";

let biz1UserId: string;
let biz1BusinessProfileId: string;

const SEOUL = { lat: 37.5665, lng: 126.978 };
const BUSAN = { lat: 35.1796, lng: 129.0756 };
const GANGNAM = { lat: 37.4979, lng: 127.0276 };

// Unique per-file prefix — prevents the parallel job-crud/job-expiry suite from
// wiping our rows mid-run. Cleanup only deletes titles starting with this.
const PREFIX = "TEST_D06_";
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
  lat: number;
  lng: number;
}) {
  const job = await createTestJob({
    authorId: biz1UserId,
    businessId: biz1BusinessProfileId,
    title: `${PREFIX}${input.title}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    lat: input.lat,
    lng: input.lng,
  });
  createdIds.push(job.id);
  return job;
}

describe("Phase 3 — PostGIS distance queries (D-06)", () => {
  describe("GIST index", () => {
    it("jobs_location_gist_idx exists in pg_indexes", async () => {
      const rows = await prisma.$queryRaw<
        { indexname: string; indexdef: string }[]
      >`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'jobs'
          AND indexname = 'jobs_location_gist_idx'
      `;
      expect(rows.length).toBe(1);
      expect(rows[0].indexdef.toLowerCase()).toContain("gist");
    });
  });

  describe("getJobsByDistance filter and sort", () => {
    it("returns Seoul test job when queried from Seoul within 5km", async () => {
      const seoulJob = await mkJob({
        title: "seoul_city_hall",
        lat: SEOUL.lat,
        lng: SEOUL.lng,
      });
      await setJobLocation(seoulJob.id, SEOUL.lng, SEOUL.lat);

      const result = await getJobsByDistance({
        userLat: SEOUL.lat,
        userLng: SEOUL.lng,
        radiusM: 5000,
        limit: 50,
      });

      const found = result.jobs.find((j) => j.id === seoulJob.id);
      expect(found).toBeDefined();
      expect(found!.distanceM).toBeGreaterThanOrEqual(0);
      // Within ~1km of itself (should be ~0m)
      expect(found!.distanceM).toBeLessThan(1000);
    });

    it("excludes Busan test job when queried from Seoul within 10km", async () => {
      const busanJob = await mkJob({
        title: "busan",
        lat: BUSAN.lat,
        lng: BUSAN.lng,
      });
      await setJobLocation(busanJob.id, BUSAN.lng, BUSAN.lat);

      const result = await getJobsByDistance({
        userLat: SEOUL.lat,
        userLng: SEOUL.lng,
        radiusM: 10000,
        limit: 100,
      });

      const found = result.jobs.find((j) => j.id === busanJob.id);
      expect(found).toBeUndefined();
    });

    it("sorts Gangnam before Busan when both are within a large radius from Seoul", async () => {
      const gangnamJob = await mkJob({
        title: "gangnam_sort",
        lat: GANGNAM.lat,
        lng: GANGNAM.lng,
      });
      await setJobLocation(gangnamJob.id, GANGNAM.lng, GANGNAM.lat);

      const busanJob = await mkJob({
        title: "busan_sort",
        lat: BUSAN.lat,
        lng: BUSAN.lng,
      });
      await setJobLocation(busanJob.id, BUSAN.lng, BUSAN.lat);

      const result = await getJobsByDistance({
        userLat: SEOUL.lat,
        userLng: SEOUL.lng,
        radiusM: 1_000_000, // 1000km — both cities included
        limit: 200,
      });

      const gangnamIdx = result.jobs.findIndex((j) => j.id === gangnamJob.id);
      const busanIdx = result.jobs.findIndex((j) => j.id === busanJob.id);
      expect(gangnamIdx).toBeGreaterThanOrEqual(0);
      expect(busanIdx).toBeGreaterThanOrEqual(0);
      // Gangnam (~8km from Seoul) must come before Busan (~320km)
      expect(gangnamIdx).toBeLessThan(busanIdx);
    });

    it("ST_MakePoint argument order: lng first, lat second (helper writes correct coordinates)", async () => {
      const job = await mkJob({
        title: "argorder",
        lat: SEOUL.lat,
        lng: SEOUL.lng,
      });
      await setJobLocation(job.id, SEOUL.lng, SEOUL.lat);

      // Read back and confirm the geography column stores the right point
      const rows = await prisma.$queryRaw<{ lng: number; lat: number }[]>`
        SELECT ST_X(location::geometry) AS lng, ST_Y(location::geometry) AS lat
        FROM public.jobs
        WHERE id = ${job.id}::uuid
      `;
      expect(rows.length).toBe(1);
      expect(Number(rows[0].lng)).toBeCloseTo(SEOUL.lng, 3);
      expect(Number(rows[0].lat)).toBeCloseTo(SEOUL.lat, 3);
    });
  });
});
