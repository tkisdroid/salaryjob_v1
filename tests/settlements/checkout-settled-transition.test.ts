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

    // H1 FIX (revision 1): Wave 0 cannot write 'settled' literal (enum value does not exist until Plan 02).
    // Use it.todo() so the test shows up in RED state cleanly without a Prisma enum validation error.
    // Plan 04 Task 1 promotes each of these to a real it() after Plan 02 pushes the enum.
    it.todo(
      "after Plan 04 edit, successful checkOut writes status='settled' (not 'completed') — promoted in Plan 04",
    );
    it.skip(
      "after Plan 04 edit, successful checkOut writes status='settled' (not 'completed')",
      async () => {
        // This test is RED in Wave 0 (Plan 01) because the action still writes 'completed'.
        // Plan 04 Task 2 flips the literal. Plan 02 Task 1 adds the enum value first.
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
        // @ts-expect-error — checkOut import path is stable from Phase 4; behaviour changes in Plan 04
        const { checkOut } = await import(
          "@/app/(worker)/my/applications/[id]/check-in/actions"
        );
        // Wave 0 expectation: Plan 04 will cause this result to carry status='settled'
        // For now, simulate current Phase 4 behaviour (writes 'completed')
        await prisma.application.update({
          where: { id: app.id },
          data: { status: "completed" },
        });
        const row = await prisma.application.findUnique({
          where: { id: app.id },
        });
        // This assertion is DELIBERATELY RED in Wave 0 — Plan 02 adds the enum and Plan 04 flips the literal.
        expect(row?.status).toBe("settled");
      },
    );

    it.todo(
      "earnings are set on the same update that writes status='settled' — promoted in Plan 04",
    );
    it.skip(
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
        const rowAfter = await prisma.application.findUnique({
          where: { id: app.id },
        });
        expect(rowAfter?.status).toBe("settled");
        expect(rowAfter?.earnings).not.toBeNull();
      },
    );
  },
);
