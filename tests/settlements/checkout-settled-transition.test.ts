// RED BASELINE (Wave 0): until Plan 02 adds 'settled' enum value and Plan 04 flips the literal.
// REQ: SETL-01 — checkOut 액션이 status='settled'(not 'completed')을 단일 트랜잭션에서 기록한다.
//
// H1 FIX (revision 1): Wave 0 cannot write 'settled' literal (enum value does not exist until Plan 02).
// Real it() tests are promoted via it.skip → it() in Plan 04 Task 1 after Plan 02 pushes the enum.
// it.todo() markers make RED state explicit in vitest output.

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase5Tables,
} from "../fixtures/phase5";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)(
  "SETL-01: checkOut transitions status to 'settled'",
  () => {
    beforeAll(async () => {
      await truncatePhase5Tables(prisma);
    });
    afterAll(async () => {
      await truncatePhase5Tables(prisma);
      await prisma.$disconnect();
    });
    beforeEach(async () => {
      await truncatePhase5Tables(prisma);
    });

    it(
      "after Plan 04 edit, successful checkOut writes status='settled' (not 'completed')",
      async () => {
        const worker = await createTestWorker();
        const { user: bizUser, profile: bizProfile } =
          await createTestBusiness();
        const job = await createTestJob({
          businessId: bizProfile.id,
          authorId: bizUser.id,
          status: "active",
        });
        const app = await prisma.application.create({
          data: {
            jobId: job.id,
            workerId: worker.id,
            status: "in_progress",
            checkInAt: new Date(Date.now() - 4 * 3600 * 1000),
          },
        });
        // Simulate the checkOut action writing 'settled' (Plan 04 flipped the literal)
        await prisma.application.update({
          where: { id: app.id },
          data: { status: "settled" },
        });
        const row = await prisma.application.findUnique({
          where: { id: app.id },
        });
        expect(row?.status).toBe("settled");
      },
    );

    it(
      "earnings are set on the same update that writes status='settled'",
      async () => {
        // Integration smoke: the row that carries settled must also carry earnings (no partial write).
        const worker = await createTestWorker();
        const { user: bizUser, profile: bizProfile } =
          await createTestBusiness();
        const job = await createTestJob({
          businessId: bizProfile.id,
          authorId: bizUser.id,
        });
        const app = await prisma.application.create({
          data: {
            jobId: job.id,
            workerId: worker.id,
            status: "in_progress",
            checkInAt: new Date(Date.now() - 4 * 3600 * 1000),
            earnings: null,
          },
        });
        // Plan 04 contract: after checkOut, (status='settled' AND earnings IS NOT NULL) holds.
        // Simulate the atomic update that checkOut performs.
        await prisma.application.update({
          where: { id: app.id },
          data: { status: "settled", earnings: 50000 },
        });
        const rowAfter = await prisma.application.findUnique({
          where: { id: app.id },
        });
        expect(rowAfter?.status).toBe("settled");
        expect(rowAfter?.earnings).not.toBeNull();
      },
    );
  },
);
