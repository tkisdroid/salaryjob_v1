// Phase 4 Wave 0 shared test fixtures
// Usage: `import { createTestWorker, createTestJob, MOCK_PUSH_KEYS } from '../fixtures/phase4'`

export * from "./users";
export * from "./jobs";
export * from "./push";

/**
 * Cleanup helper for Phase 4 integration tests. Aborts if DATABASE_URL points at
 * a production-like URL — last line of defense per threat T-04-03.
 *
 * Phase 4-10 change: scoped cleanup that preserves the Phase 2/3 seed
 * (@dev.gignow.com accounts + their profiles/jobs). Phase 4 fixtures always
 * create users whose emails end with @test.local (see createTestWorker /
 * createTestBusiness), so deleting those users cascades through all dependent
 * rows (applications, jobs, profiles, push_subscriptions) without touching
 * the Phase 2/3 regression-test data that tests/profile, tests/data,
 * tests/jobs rely on.
 */
export async function truncatePhase4Tables(prisma: {
  $executeRawUnsafe: (sql: string) => Promise<number>;
}) {
  const url = process.env.DATABASE_URL ?? "";
  if (/prod|production/i.test(url)) {
    throw new Error(
      "[phase4 fixtures] truncatePhase4Tables aborted: DATABASE_URL looks production-like",
    );
  }
  // Delete phase-4 fixture users; ON DELETE CASCADE on
  // worker_profiles.userId / business_profiles.userId / jobs.authorId /
  // applications.workerId / push_subscriptions.userId / reviews.* takes care
  // of every dependent row without touching the seed.
  await prisma.$executeRawUnsafe(
    "DELETE FROM public.users WHERE email LIKE '%@test.local'",
  );
  // Also clear any orphan push_subscriptions just in case a fixture inserted
  // them with a seed user id (tests/push/*.test.ts uses a seeded worker).
  await prisma.$executeRawUnsafe(
    "DELETE FROM public.push_subscriptions WHERE endpoint LIKE 'https://mock.push%'",
  );
}
