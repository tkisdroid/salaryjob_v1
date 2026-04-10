import '@testing-library/jest-dom/vitest';
import { config } from 'dotenv';
import path from 'node:path';

// Load .env.local for test environment (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, etc.)
// This mirrors Next.js behaviour which auto-loads .env.local in dev/test.
config({ path: path.resolve(process.cwd(), '.env.local') });

// Phase 4-10: force NODE_ENV=test. The repo's .env.local pins NODE_ENV to
// 'development' (required for `next dev` logs), but src/lib/dal.ts uses
// NODE_ENV==='test' as the switch between Supabase cookie session resolution
// and the DB-backed test resolver (resolveTestWorkerSession /
// resolveTestBusinessSession) that Phase 4 integration tests rely on.
// Without this override, applyOneTap / accept / reject Server Actions throw
// `cookies() was called outside a request scope` inside vitest.
process.env.NODE_ENV = 'test';
