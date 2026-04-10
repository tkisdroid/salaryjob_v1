// REQ: DATA-03 — 6 tables exist after migration; RLS enabled on user/profile tables + jobs (Phase 3); still disabled on applications/reviews (Phase 4/5 scope)
import { describe, it, expect } from 'vitest';
import { skipIfNoSupabase } from '../helpers/skip-if-no-supabase';

describe.skipIf(skipIfNoSupabase())('DATA-03 migrations', () => {
  it('creates all 6 required tables', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [['users', 'worker_profiles', 'business_profiles', 'jobs', 'applications', 'reviews']]
    );
    await client.end();
    const tables = res.rows.map((r: { tablename: string }) => r.tablename).sort();
    expect(tables).toEqual(['applications', 'business_profiles', 'jobs', 'reviews', 'users', 'worker_profiles']);
  });

  it('RLS is enabled on users, worker_profiles, business_profiles, jobs (Phase 3)', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [['users', 'worker_profiles', 'business_profiles', 'jobs']]
    );
    await client.end();
    for (const row of res.rows) {
      expect(row.rowsecurity, `RLS should be enabled on ${row.tablename}`).toBe(true);
    }
  });

  it('RLS is disabled on applications, reviews (Phase 4/5 scope)', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [['applications', 'reviews']]
    );
    await client.end();
    for (const row of res.rows) {
      expect(row.rowsecurity, `RLS should be disabled on ${row.tablename}`).toBe(false);
    }
  });
});
