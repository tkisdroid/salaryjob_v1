import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // CONTEXT.md D-07: primary key name is NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
    // Fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY for .env.local compatibility.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
