// REQ: DATA-02 — PostGIS extension enabled + geography column present on jobs table
import { describe, it, expect } from 'vitest';
import { skipIfNoSupabase } from '../helpers/skip-if-no-supabase';

describe.skipIf(skipIfNoSupabase())('DATA-02 PostGIS', () => {
  it('has postgis extension installed', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query('SELECT PostGIS_Version()');
    await client.end();
    expect(res.rows[0].postgis_version).toBeTruthy();
  });

  it('jobs.location column exists as geography', async () => {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    await client.connect();
    const res = await client.query(
      `SELECT udt_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='location'`
    );
    await client.end();
    expect(res.rows[0]?.udt_name).toBe('geography');
  });
});
