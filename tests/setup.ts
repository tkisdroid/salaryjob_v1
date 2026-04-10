import '@testing-library/jest-dom/vitest';
import { config } from 'dotenv';
import path from 'node:path';

// Load .env.local for test environment (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, etc.)
// This mirrors Next.js behaviour which auto-loads .env.local in dev/test.
config({ path: path.resolve(process.cwd(), '.env.local') });
