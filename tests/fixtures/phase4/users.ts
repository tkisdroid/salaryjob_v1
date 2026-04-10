// Phase 4 Wave 0 test fixtures — users
//
// NOTE: These fixtures are RED BASELINE. They will run successfully only after:
//   - Plan 04-02 applies `ApplicationStatus.pending` + WorkerProfile.noShowCount (prisma db push)
//   - Plan 04-03 re-enables applications RLS + realtime publication
// Until then, integration tests that import these will fail at prisma insert step.
//
// SAFETY: truncate helpers in test files MUST abort if DATABASE_URL contains 'prod'.

import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";

export interface CreateTestWorkerOpts {
  email?: string;
  name?: string;
  noShowCount?: number;
}

export async function createTestWorker(opts: CreateTestWorkerOpts = {}) {
  const id = randomUUID();
  const email = opts.email ?? `worker-${id.slice(0, 8)}@test.local`;
  const user = await prisma.user.create({
    data: { id, email, role: "WORKER" },
  });
  await prisma.workerProfile.create({
    data: {
      userId: id,
      name: opts.name ?? `Worker ${id.slice(0, 4)}`,
      preferredCategories: ["food", "retail"],
      // noShowCount field added in Plan 04-02. Using raw field name via any-cast
      // so the fixture compiles even before schema migration runs.
      ...(opts.noShowCount !== undefined
        ? ({ noShowCount: opts.noShowCount } as unknown as Record<
            string,
            never
          >)
        : {}),
    },
  });
  return user;
}

export interface CreateTestBusinessOpts {
  email?: string;
  name?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export async function createTestBusiness(opts: CreateTestBusinessOpts = {}) {
  const id = randomUUID();
  const email = opts.email ?? `biz-${id.slice(0, 8)}@test.local`;
  const user = await prisma.user.create({
    data: { id, email, role: "BUSINESS" },
  });
  const lat = opts.lat ?? 37.4979;
  const lng = opts.lng ?? 127.0276;
  const profile = await prisma.businessProfile.create({
    data: {
      userId: id,
      name: opts.name ?? `Biz ${id.slice(0, 4)}`,
      category: "food",
      address: opts.address ?? "서울 강남구 테헤란로 212",
      lat,
      lng,
    },
  });
  // geography Point stored in Unsupported column — raw SQL update required
  await prisma.$executeRawUnsafe(
    `UPDATE public.business_profiles
     SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     WHERE id = $3::uuid`,
    lng,
    lat,
    profile.id,
  );
  return { user, profile };
}
