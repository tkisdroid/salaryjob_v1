// Phase 4 Wave 0 shared test fixtures
// Usage: `import { createTestWorker, createTestJob, MOCK_PUSH_KEYS } from '../fixtures/phase4'`

export * from "./users";
export * from "./jobs";
export * from "./push";

/**
 * TRUNCATE helper for Phase 4 integration tests. Aborts if DATABASE_URL points at
 * a production-like URL — last line of defense per threat T-04-03.
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
  await prisma.$executeRawUnsafe(
    "TRUNCATE TABLE public.push_subscriptions, public.applications, public.jobs, public.business_profiles, public.worker_profiles, public.users RESTART IDENTITY CASCADE",
  );
}
