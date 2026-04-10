// RED BASELINE (Wave 0): until Plan 04-03 ships pg_cron auto-accept SQL.
// REQ: APPL-04 auto-accept — pending applications older than 30 minutes are
// transitioned to confirmed by a Postgres scheduled job.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  createTestBusiness,
  createTestJob,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";

// Mirror of the SQL the migration must install. Plan 04-03 will copy this exact
// statement into supabase/migrations/.
const AUTO_ACCEPT_SQL = `
  UPDATE public.applications
  SET status = 'confirmed'
  WHERE status = 'pending'
    AND "appliedAt" < (now() - interval '30 minutes')
`;

describe.skipIf(skipIfNoSupabase())("APPL-04 auto-accept cron SQL", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("transitions pending apps older than 30 minutes to confirmed", async () => {
    const worker = await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 5,
    });

    const app = await prisma.application.create({
      data: {
        jobId: job.id,
        workerId: worker.id,
        status: "pending" as never,
      },
    });
    // Backdate appliedAt to 31 minutes ago via raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE public.applications SET "appliedAt" = now() - interval '31 minutes' WHERE id = $1::uuid`,
      app.id,
    );

    await prisma.$executeRawUnsafe(AUTO_ACCEPT_SQL);

    const after = await prisma.application.findUnique({ where: { id: app.id } });
    expect(after?.status).toBe("confirmed");
  });

  it("does NOT transition pending apps younger than 30 minutes", async () => {
    const worker = await createTestWorker();
    const { user: bizUser, profile } = await createTestBusiness();
    const job = await createTestJob({
      businessId: profile.id,
      authorId: bizUser.id,
      headcount: 5,
    });

    const app = await prisma.application.create({
      data: {
        jobId: job.id,
        workerId: worker.id,
        status: "pending" as never,
      },
    });
    await prisma.$executeRawUnsafe(
      `UPDATE public.applications SET "appliedAt" = now() - interval '29 minutes' WHERE id = $1::uuid`,
      app.id,
    );

    await prisma.$executeRawUnsafe(AUTO_ACCEPT_SQL);

    const after = await prisma.application.findUnique({ where: { id: app.id } });
    expect(after?.status).toBe("pending");
  });
});
