// Phase 4 Wave 0 test fixtures — jobs
//
// NOTE: RED BASELINE — relies on Prisma Job model already shipped in Phase 3.
// Compatible with Phase 4 schema changes (no breaking changes to Job shape).

import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";

export interface CreateTestJobOpts {
  businessId: string; // BusinessProfile.id
  authorId: string; // User.id (business owner)
  headcount?: number;
  filled?: number;
  startHour?: number; // default 10 (Asia/Seoul hour)
  workDateOffsetDays?: number; // default 0 (today)
  hourlyPay?: number;
  transportFee?: number;
  lat?: number;
  lng?: number;
  status?: string;
  title?: string;
  category?:
    | "food"
    | "retail"
    | "logistics"
    | "office"
    | "event"
    | "cleaning"
    | "education"
    | "tech";
}

export async function createTestJob(opts: CreateTestJobOpts) {
  const id = randomUUID();
  const workDate = new Date();
  workDate.setUTCDate(workDate.getUTCDate() + (opts.workDateOffsetDays ?? 0));
  workDate.setUTCHours(0, 0, 0, 0);

  const h = opts.startHour ?? 10;
  const startTime = `${String(h).padStart(2, "0")}:00`;
  const endTime = `${String((h + 4) % 24).padStart(2, "0")}:00`;

  const lat = opts.lat ?? 37.4979;
  const lng = opts.lng ?? 127.0276;

  const job = await prisma.job.create({
    data: {
      id,
      businessId: opts.businessId,
      authorId: opts.authorId,
      title: opts.title ?? `Test Job ${id.slice(0, 4)}`,
      category: opts.category ?? "food",
      description: "fixture",
      hourlyPay: opts.hourlyPay ?? 12000,
      transportFee: opts.transportFee ?? 2000,
      workDate,
      startTime,
      endTime,
      workHours: 4,
      headcount: opts.headcount ?? 1,
      filled: opts.filled ?? 0,
      lat,
      lng,
      status: opts.status ?? "active",
    },
  });

  // geography column update (Prisma cannot natively write Unsupported)
  await prisma.$executeRawUnsafe(
    `UPDATE public.jobs
     SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     WHERE id = $3::uuid`,
    lng,
    lat,
    id,
  );

  return job;
}
