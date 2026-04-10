// GigNow Phase 2 — Dev seed script
// REQ: DATA-04
// Populates: 6 auth.users + public.users, 1 WorkerProfile (kim-jihoon),
//            8 BusinessProfile (+ PostGIS location), 8 Job (+ PostGIS location),
//            5 Application (kim-jihoon → various jobs), 0 Review (Phase 5)
//
// Design rules (D-04):
//   1. mock-data.ts values transplanted exactly — no new fake data
//   2. @gignow.dev domain for test account identification
//   3. NODE_ENV === 'production' → throws immediately
//   4. Reverse-order deleteMany for idempotency
//   5. supabase.auth.admin.createUser (bypasses email confirm + RLS + rate limits)
//   6. Trigger auto-creates public.users row → Prisma.user.update overrides role
//   7. Raw SQL ($executeRaw) for geography columns (Prisma cannot write Unsupported())

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import {
  MOCK_BUSINESSES,
  MOCK_JOBS,
  MOCK_APPLICATIONS,
  MOCK_CURRENT_WORKER,
} from "../src/lib/mock-data";
import "dotenv/config";

// ── Production guard (D-04 rule 3) ──────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  throw new Error("❌ Seed script refused to run in production");
}

// ── Service role key safety check (Pitfall #10) ─────────────────────────────
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "❌ SUPABASE_SERVICE_ROLE_KEY missing — check .env.local (server-only key, never commit)"
  );
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL missing — check .env.local");
}
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL missing — check .env.local");
}

// ── Clients ──────────────────────────────────────────────────────────────────
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Service-role admin client — bypasses RLS, can call auth.admin.*
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Dev account definitions ──────────────────────────────────────────────────
const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD ?? "gignowdev";

const DEV_ACCOUNTS = [
  { email: "worker@dev.gignow.com", role: "WORKER", profile: "kim-jihoon" },
  { email: "worker2@dev.gignow.com", role: "WORKER", profile: "empty" },
  { email: "business@dev.gignow.com", role: "BUSINESS", profile: "biz-1" }, // 스타벅스 역삼점
  { email: "business2@dev.gignow.com", role: "BUSINESS", profile: "biz-2" }, // 쿠팡 송파
  { email: "both@dev.gignow.com", role: "BOTH", profile: "both" },
  { email: "admin@dev.gignow.com", role: "ADMIN", profile: "admin" },
] as const;

// Business ownership: biz-1 → business+test, biz-2 → business2+test,
// biz-3..8 → admin+test (admin can own multiple via 1:many BusinessProfile)
const BIZ_OWNERSHIP: Record<string, string> = {
  "biz-1": "biz-1",
  "biz-2": "biz-2",
  "biz-3": "admin",
  "biz-4": "admin",
  "biz-5": "admin",
  "biz-6": "admin",
  "biz-7": "admin",
  "biz-8": "admin",
};

// ── Main seed function ────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 GigNow Phase 2 seed starting...");

  // ── Step 1: Reverse-order deleteMany (FK-safe, idempotent) ─────────────────
  console.log("  Step 1: Cleaning existing seed data (reverse FK order)...");
  await prisma.review.deleteMany();
  await prisma.application.deleteMany();
  await prisma.job.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany();

  // Also clean auth.users for dev domain
  const { data: existingAuthUsers, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  for (const u of existingAuthUsers.users) {
    if (u.email?.endsWith("@dev.gignow.com")) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) throw error;
    }
  }
  console.log(
    `    Cleaned ${existingAuthUsers.users.filter((u) => u.email?.endsWith("@dev.gignow.com")).length} auth.users`
  );

  // ── Step 2: Create 6 dev auth.users via Admin API ──────────────────────────
  console.log("  Step 2: Creating 6 dev auth.users...");
  const createdUsers: Record<string, string> = {}; // profile-key → UUID

  for (const acct of DEV_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: acct.email,
      password: DEV_PASSWORD,
      email_confirm: true, // skip email verification for dev accounts
      app_metadata: { role: acct.role },
    });
    if (error) throw error;

    const userId = data.user.id;
    createdUsers[acct.profile] = userId;

    // Trigger handle_new_user fires → public.users row created with role=WORKER default
    // Override role via Prisma to match intended dev role
    // Small delay to let trigger complete (supabase trigger is synchronous but let's be safe)
    await prisma.user.update({
      where: { id: userId },
      data: { role: acct.role as "WORKER" | "BUSINESS" | "BOTH" | "ADMIN" },
    });
    console.log(`    Created: ${acct.email} (${acct.role})`);
  }

  // ── Step 3: WorkerProfile for kim-jihoon (from MOCK_CURRENT_WORKER) ────────
  console.log("  Step 3: Creating WorkerProfile for kim-jihoon...");
  await prisma.workerProfile.create({
    data: {
      userId: createdUsers["kim-jihoon"],
      name: MOCK_CURRENT_WORKER.name,
      nickname: MOCK_CURRENT_WORKER.nickname,
      avatar: MOCK_CURRENT_WORKER.avatar,
      bio: MOCK_CURRENT_WORKER.bio,
      preferredCategories:
        MOCK_CURRENT_WORKER.preferredCategories as (
          | "food"
          | "retail"
          | "logistics"
          | "office"
          | "event"
          | "cleaning"
          | "education"
          | "tech"
        )[],
      badgeLevel:
        MOCK_CURRENT_WORKER.badgeLevel as
          | "newbie"
          | "bronze"
          | "silver"
          | "gold"
          | "platinum"
          | "diamond",
      rating: MOCK_CURRENT_WORKER.rating,
      totalJobs: MOCK_CURRENT_WORKER.totalJobs,
      completionRate: MOCK_CURRENT_WORKER.completionRate,
    },
  });

  // ── Step 4: BusinessProfile × 8 (all MOCK_BUSINESSES) ─────────────────────
  console.log("  Step 4: Creating 8 BusinessProfiles...");
  const bizIdMap: Record<string, string> = {}; // mock-id → db-uuid

  for (const mockBiz of MOCK_BUSINESSES) {
    const ownerProfileKey = BIZ_OWNERSHIP[mockBiz.id];
    const ownerUserId = createdUsers[ownerProfileKey];

    const created = await prisma.businessProfile.create({
      data: {
        userId: ownerUserId,
        name: mockBiz.name,
        category: mockBiz.category as
          | "food"
          | "retail"
          | "logistics"
          | "office"
          | "event"
          | "cleaning"
          | "education"
          | "tech",
        logo: mockBiz.logo,
        address: mockBiz.address,
        addressDetail: mockBiz.addressDetail || null,
        lat: mockBiz.lat,
        lng: mockBiz.lng,
        rating: mockBiz.rating,
        reviewCount: mockBiz.reviewCount,
        completionRate: mockBiz.completionRate,
        verified: mockBiz.verified,
        description: mockBiz.description,
      },
    });
    bizIdMap[mockBiz.id] = created.id;
    console.log(`    Created: ${mockBiz.name} (${created.id.slice(0, 8)}...)`);
  }

  // ── Step 5: Populate geography column for each BusinessProfile ─────────────
  // (Prisma cannot write Unsupported() columns — must use raw SQL)
  console.log("  Step 5: Setting PostGIS location for business profiles...");
  for (const mockBiz of MOCK_BUSINESSES) {
    const dbId = bizIdMap[mockBiz.id];
    await prisma.$executeRaw`
      UPDATE public.business_profiles
      SET location = ST_SetSRID(ST_MakePoint(${mockBiz.lng}, ${mockBiz.lat}), 4326)::geography
      WHERE id = ${dbId}::uuid
    `;
  }

  // ── Step 6: Job × 8 (MOCK_JOBS) ───────────────────────────────────────────
  console.log("  Step 6: Creating 8 Jobs...");
  const jobIdMap: Record<string, string> = {}; // mock-id → db-uuid

  for (const mockJob of MOCK_JOBS) {
    const businessDbId = bizIdMap[mockJob.businessId];
    const ownerProfileKey = BIZ_OWNERSHIP[mockJob.businessId];
    const ownerUserId = createdUsers[ownerProfileKey];

    const job = await prisma.job.create({
      data: {
        businessId: businessDbId,
        authorId: ownerUserId,
        title: mockJob.title,
        category: mockJob.category as
          | "food"
          | "retail"
          | "logistics"
          | "office"
          | "event"
          | "cleaning"
          | "education"
          | "tech",
        description: mockJob.description,
        hourlyPay: mockJob.hourlyPay,
        transportFee: mockJob.transportFee,
        workDate: new Date(mockJob.workDate),
        startTime: mockJob.startTime,
        endTime: mockJob.endTime,
        workHours: mockJob.workHours,
        headcount: mockJob.headcount,
        filled: mockJob.filled,
        lat: mockJob.business.lat,   // denormalized for fast distance queries
        lng: mockJob.business.lng,
        status: "active",
        isUrgent: mockJob.isUrgent,
        nightShiftAllowance: mockJob.nightShiftAllowance,
      },
    });
    jobIdMap[mockJob.id] = job.id;

    // Set PostGIS geography column for the job
    await prisma.$executeRaw`
      UPDATE public.jobs
      SET location = ST_SetSRID(ST_MakePoint(${mockJob.business.lng}, ${mockJob.business.lat}), 4326)::geography
      WHERE id = ${job.id}::uuid
    `;
    console.log(`    Created: ${mockJob.title} (${job.id.slice(0, 8)}...)`);
  }

  // ── Step 7: Application × 5 (MOCK_APPLICATIONS) — all owned by kim-jihoon ─
  console.log("  Step 7: Creating 5 Applications for kim-jihoon...");
  for (const mockApp of MOCK_APPLICATIONS) {
    const jobDbId = jobIdMap[mockApp.jobId];
    await prisma.application.create({
      data: {
        jobId: jobDbId,
        workerId: createdUsers["kim-jihoon"],
        status: mockApp.status as
          | "confirmed"
          | "in_progress"
          | "checked_in"
          | "completed"
          | "cancelled",
        appliedAt: new Date(mockApp.appliedAt),
        checkInAt: mockApp.checkInAt ? new Date(mockApp.checkInAt) : null,
        checkOutAt: mockApp.checkOutAt ? new Date(mockApp.checkOutAt) : null,
        actualHours: mockApp.actualHours ?? undefined,
        earnings: mockApp.earnings ?? undefined,
        reviewGiven: mockApp.reviewGiven,
        reviewReceived: mockApp.reviewReceived,
      },
    });
    console.log(`    Created: application ${mockApp.id} → job ${mockApp.jobId}`);
  }

  // ── Step 8: Reviews = empty (Phase 5 will populate) ───────────────────────
  // (no insert needed)

  // ── Final count verification ───────────────────────────────────────────────
  const [userCount, workerCount, bizCount, jobCount, appCount, reviewCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.workerProfile.count(),
      prisma.businessProfile.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.review.count(),
    ]);

  console.log(`
✅ Seed complete:
   users             : ${userCount} (expected 6)
   worker_profiles   : ${workerCount} (expected 1)
   business_profiles : ${bizCount} (expected 8)
   jobs              : ${jobCount} (expected 8)
   applications      : ${appCount} (expected 5)
   reviews           : ${reviewCount} (expected 0)
  `);

  if (
    userCount < 6 ||
    workerCount < 1 ||
    bizCount < 8 ||
    jobCount < 8 ||
    appCount < 5 ||
    reviewCount !== 0
  ) {
    throw new Error("❌ Seed count mismatch — check output above");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
