/**
 * Direct DB round-trip test for saveAvailability / loadAvailability.
 *
 * Proof that clicking "저장" on /my/availability really hits the Postgres
 * worker_profiles.availabilitySlots column end-to-end. Runs against the
 * dev Supabase instance using the same @/generated/prisma client the
 * Server Action uses in production.
 *
 * Test strategy:
 *   1. Create a fresh @test.local worker via the Phase 4 fixture helper
 *      — this worker is picked up by DAL's NODE_ENV=test+VITEST resolver
 *      so saveAvailability()/loadAvailability() auth against it.
 *   2. Load — expect empty array (fresh profile).
 *   3. Save a known slot list.
 *   4. Load — expect the normalized + sorted slot list back.
 *   5. Inspect worker_profiles.availabilitySlots directly via Prisma to
 *      prove the value landed in Postgres, not just the React cache.
 *   6. Save an empty list to confirm clearing works.
 *   7. Cleanup via the Phase 4 truncate helper so the test is idempotent.
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { createTestWorker } from "../fixtures/phase4/users";
import { truncatePhase4Tables } from "../fixtures/phase4";
import {
  loadAvailability,
  saveAvailability,
} from "@/app/(worker)/my/availability/actions";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "availability save/load DB round-trip",
  () => {
    beforeAll(async () => {
      await truncatePhase4Tables(prisma);
    });
    afterAll(async () => {
      await truncatePhase4Tables(prisma);
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await truncatePhase4Tables(prisma);
    });

    it("starts empty, persists a selection, and reads it back from Postgres", async () => {
      const worker = await createTestWorker();

      // 1. Initial load — fresh profile, column defaults to [].
      const initial = await loadAvailability();
      expect(initial).toEqual([]);

      // 2. Save a mixed, unsorted selection.
      const inputSlots = ["wed-14", "mon-9", "fri-20", "mon-10"];
      const saveResult = await saveAvailability({ slots: inputSlots });
      expect(saveResult).toMatchObject({ success: true, count: 4 });

      // 3. Load back via the server action — sorted + deduped.
      const loaded = await loadAvailability();
      expect(loaded).toEqual(["mon-9", "mon-10", "wed-14", "fri-20"]);

      // 4. Direct DB inspection — bypass the server action and read the
      //    column from Postgres to prove the value landed in storage, not
      //    a per-request cache or in-memory map.
      const row = await prisma.workerProfile.findUnique({
        where: { userId: worker.id },
        select: { availabilitySlots: true },
      });
      expect(row?.availabilitySlots).toEqual([
        "mon-9",
        "mon-10",
        "wed-14",
        "fri-20",
      ]);
    });

    it("deduplicates repeated slot keys before persisting", async () => {
      await createTestWorker();

      const result = await saveAvailability({
        slots: ["tue-13", "tue-13", "tue-14", "tue-14", "tue-13"],
      });
      expect(result).toMatchObject({ success: true, count: 2 });

      const loaded = await loadAvailability();
      expect(loaded).toEqual(["tue-13", "tue-14"]);
    });

    it("rejects malformed slot keys without touching the DB", async () => {
      const worker = await createTestWorker();

      const result = await saveAvailability({
        slots: ["mon-9", "xxx-99", "tue-10"],
      });
      expect(result).toMatchObject({ success: false });

      // Confirm the rejected payload did NOT partially land in the DB.
      const row = await prisma.workerProfile.findUnique({
        where: { userId: worker.id },
        select: { availabilitySlots: true },
      });
      expect(row?.availabilitySlots).toEqual([]);
    });

    it("clearing the selection writes an empty array to the column", async () => {
      const worker = await createTestWorker();

      await saveAvailability({ slots: ["mon-9", "mon-10"] });
      const afterFirst = await prisma.workerProfile.findUnique({
        where: { userId: worker.id },
        select: { availabilitySlots: true },
      });
      expect(afterFirst?.availabilitySlots).toHaveLength(2);

      const clearResult = await saveAvailability({ slots: [] });
      expect(clearResult).toMatchObject({ success: true, count: 0 });

      const afterClear = await prisma.workerProfile.findUnique({
        where: { userId: worker.id },
        select: { availabilitySlots: true },
      });
      expect(afterClear?.availabilitySlots).toEqual([]);
    });

    it("enforces the 168-slot ceiling", async () => {
      await createTestWorker();
      const tooMany = Array.from({ length: 169 }, (_, i) => `mon-${i % 24}`);
      const result = await saveAvailability({ slots: tooMany });
      expect(result).toMatchObject({ success: false });
    });
  },
);
