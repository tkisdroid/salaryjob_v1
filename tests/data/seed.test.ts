// REQ: DATA-04 — Seed populates: 6 users, 1 worker_profile (kim-jihoon), 8 business_profiles, 8 jobs, 5 applications, 0 reviews
import { beforeAll, describe, it, expect } from 'vitest';
import { skipIfNoSupabase } from '../helpers/skip-if-no-supabase';

describe.skipIf(skipIfNoSupabase())('DATA-04 seed data', () => {
  beforeAll(async () => {
    const { disconnectSeedPrisma, seedDatabase } = await import('../../prisma/seed');
    await seedDatabase();
    await disconnectSeedPrisma();
  }, 120_000);

  it('has 6 seeded users in public.users', async () => {
    // Dynamic import so Prisma client is not initialized before env vars are loaded
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  it('has 1 worker_profile (kim-jihoon)', async () => {
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.workerProfile.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('has 8 business_profiles', async () => {
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.businessProfile.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  it('has 8 jobs', async () => {
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.job.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  it('has 5 applications', async () => {
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.application.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it('has 0 reviews initially', async () => {
    const { default: prisma } = await import('@/lib/db');
    const count = await prisma.review.count();
    expect(count).toBe(0);
  });
});
