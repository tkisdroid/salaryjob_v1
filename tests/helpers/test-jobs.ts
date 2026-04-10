import { prisma } from "@/lib/db";
import type { JobCategory } from "@/lib/types/job";

export interface CreateTestJobInput {
  authorId: string; // User.id (business owner)
  businessId: string; // BusinessProfile.id
  title?: string;
  category?: JobCategory;
  hourlyPay?: number;
  workDate?: Date; // default: today + 7 days
  startTime?: string; // default: "10:00"
  endTime?: string; // default: "14:00"
  lat?: number; // default: 37.5665 (Seoul City Hall)
  lng?: number; // default: 126.9780
  status?: string; // default: "active"
}

/**
 * Create a test Job row. Caller is responsible for cleanup.
 * Uses a TEST_ prefix in title so cleanupTestJobs() can find them.
 */
export async function createTestJob(input: CreateTestJobInput) {
  const workDate =
    input.workDate ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return prisma.job.create({
    data: {
      authorId: input.authorId,
      businessId: input.businessId,
      title:
        input.title ??
        `TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      category: input.category ?? "food",
      description: "Wave 0 test fixture",
      hourlyPay: input.hourlyPay ?? 12000,
      transportFee: 0,
      workDate,
      startTime: input.startTime ?? "10:00",
      endTime: input.endTime ?? "14:00",
      workHours: 4,
      headcount: 1,
      filled: 0,
      lat: input.lat ?? 37.5665,
      lng: input.lng ?? 126.978,
      status: input.status ?? "active",
      isUrgent: false,
      nightShiftAllowance: false,
      duties: [],
      requirements: [],
      whatToBring: [],
      tags: [],
    },
  });
}

/**
 * Clean up all test jobs created by createTestJob (title starts with "TEST_").
 */
export async function cleanupTestJobs() {
  await prisma.job.deleteMany({
    where: { title: { startsWith: "TEST_" } },
  });
}

/**
 * Set a job's location geography column via raw SQL (Prisma can't write Unsupported).
 * Required for PostGIS distance tests.
 */
export async function setJobLocation(
  jobId: string,
  lng: number,
  lat: number,
) {
  await prisma.$executeRaw`
    UPDATE public.jobs
    SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE id = ${jobId}::uuid
  `;
}
