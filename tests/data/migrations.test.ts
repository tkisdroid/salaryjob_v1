// REQ: DATA-03 — 6 tables exist after migration.
// RLS state across phases:
//   Phase 3: enabled on users, worker_profiles, business_profiles, jobs
//   Phase 4 (04-03): re-enabled on applications (workflow re-added 5 policies)
//   Phase 5 (code-review fix): re-enabled on reviews via
//     supabase/migrations/20260413000002_reviews_rls_phase5.sql with strict
//     bilateral SELECT policies and INSERT/UPDATE/DELETE blocked for the
//     authenticated role. Server Actions still bypass RLS via service_role.
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

  it('RLS is enabled on users, worker_profiles, business_profiles, jobs, applications, reviews (Phase 3 + Phase 4-03 + Phase 5 code-review)', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [['users', 'worker_profiles', 'business_profiles', 'jobs', 'applications', 'reviews']]
    );
    await client.end();
    for (const row of res.rows) {
      expect(row.rowsecurity, `RLS should be enabled on ${row.tablename}`).toBe(true);
    }
  });

  it('reviews has bilateral SELECT policies + INSERT/UPDATE/DELETE blocked (Phase 5 code-review fix)', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reviews' ORDER BY policyname`
    );
    await client.end();
    const names = res.rows.map((r: { policyname: string }) => r.policyname);
    // Three SELECT policies (reviewer, reviewee, job_owner) + three blocked policies
    // (insert, update, delete) — see supabase/migrations/20260413000002_reviews_rls_phase5.sql
    expect(names).toContain('reviews_select_reviewer');
    expect(names).toContain('reviews_select_reviewee');
    expect(names).toContain('reviews_select_job_owner');
    expect(names).toContain('reviews_insert_blocked');
    expect(names).toContain('reviews_update_blocked');
    expect(names).toContain('reviews_delete_blocked');
  });
});
