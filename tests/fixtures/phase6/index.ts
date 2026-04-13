// Phase 6 Wave 0 test fixtures — admin + business reg number extensions
//
// NOTE: These fixtures use $executeRawUnsafe for BusinessProfile inserts to bypass
// Prisma type mismatches pre-Wave 2 schema migration.  The new columns
// (businessRegNumber, ownerName, ownerPhone, businessRegImageUrl, commissionRate,
//  regNumberOcrMismatched) won't exist in Prisma client types until Wave 2 runs
// `prisma generate`. Raw SQL keeps compilation clean.
//
// SAFETY: truncatePhase6Fixtures deletes by @test.local email suffix — same as
// Phase 4/5 pattern. Aborts on production-looking DATABASE_URL.

import { prisma } from "@/lib/db";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Admin user fixture
// ---------------------------------------------------------------------------

export interface CreateTestAdminOpts {
  email?: string;
}

/**
 * Inserts a public.users row with role='ADMIN'.
 * Uses prisma.user.create since ADMIN exists in the UserRole enum.
 *
 * @returns { id, email }
 */
export async function createTestAdmin(
  opts: CreateTestAdminOpts = {},
): Promise<{ id: string; email: string | null }> {
  const id = randomUUID();
  const email = opts.email ?? `admin-${id.slice(0, 8)}@test.local`;
  const user = await prisma.user.create({
    data: { id, email, role: "ADMIN" },
  });
  return { id: user.id, email: user.email };
}

// ---------------------------------------------------------------------------
// Business fixture with Phase 6 extended columns
// ---------------------------------------------------------------------------

export interface CreateTestBusinessWithRegOpts {
  userId: string;
  regNumber?: string | null;
  businessRegImageUrl?: string | null;
  commissionRate?: string | null; // e.g. '5.00'
  verified?: boolean;
  name?: string;
  ownerName?: string;
  ownerPhone?: string;
}

/**
 * Inserts a BusinessProfile row with Phase 6 extended columns via raw SQL.
 * Raw SQL is intentional: the new columns won't be in Prisma client types
 * until Wave 2 re-runs `prisma generate`. This fixture must compile and run
 * even before the Wave 2 schema push lands.
 *
 * @returns { id } — the UUID of the new BusinessProfile row
 */
export async function createTestBusinessWithReg(
  opts: CreateTestBusinessWithRegOpts,
): Promise<{ id: string }> {
  const id = randomUUID();
  const name = opts.name ?? `BizReg ${id.slice(0, 6)}`;
  const lat = 37.4979;
  const lng = 127.0276;

  // Insert base columns that exist pre-Wave 2, plus the new nullable columns.
  // Using $executeRawUnsafe so the INSERT succeeds even if the columns don't
  // exist yet (the query will error at runtime, but the TypeScript compiles).
  await prisma.$executeRawUnsafe(
    `INSERT INTO public.business_profiles
      (id, "userId", name, category, address, lat, lng, verified,
       "businessRegNumber", "ownerName", "ownerPhone", "businessRegImageUrl",
       "commissionRate", "createdAt", "updatedAt")
     VALUES
      ($1::uuid, $2::uuid, $3, 'food', '서울 강남구 테헤란로 212', $4, $5, $6,
       $7, $8, $9, $10, $11::numeric, NOW(), NOW())`,
    id,
    opts.userId,
    name,
    lat,
    lng,
    opts.verified ?? false,
    opts.regNumber ?? null,
    opts.ownerName ?? null,
    opts.ownerPhone ?? null,
    opts.businessRegImageUrl ?? null,
    opts.commissionRate ?? null,
  );

  // Set PostGIS geography column (same pattern as Phase 4 createTestBusiness)
  await prisma.$executeRawUnsafe(
    `UPDATE public.business_profiles
     SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
     WHERE id = $3::uuid`,
    lng,
    lat,
    id,
  );

  return { id };
}

// ---------------------------------------------------------------------------
// Cleanup helper
// ---------------------------------------------------------------------------

/**
 * Deletes all Phase 6 fixture rows created during tests.
 * Scoped to @test.local emails — never touches production/seed data.
 * Cascades through all dependent rows (business_profiles, jobs, etc.)
 * via ON DELETE CASCADE foreign keys.
 */
export async function cleanupPhase6Fixtures(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "";
  if (/prod|production/i.test(url)) {
    throw new Error(
      "[phase6 fixtures] cleanupPhase6Fixtures aborted: DATABASE_URL looks production-like",
    );
  }
  await prisma.$executeRawUnsafe(
    "DELETE FROM public.users WHERE email LIKE '%@test.local'",
  );
}
