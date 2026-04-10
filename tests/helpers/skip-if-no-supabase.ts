/**
 * Returns true if Supabase env vars are not set yet.
 * Vitest tests should call `describe.skipIf(skipIfNoSupabase())`
 * so Wave 0 stubs are RED (placeholder) without env and GREEN after Plan 02 provisioning.
 */
export function skipIfNoSupabase(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL
    || !process.env.SUPABASE_SERVICE_ROLE_KEY
    || !process.env.DATABASE_URL;
}
