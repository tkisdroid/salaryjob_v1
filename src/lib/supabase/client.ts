import { createBrowserClient } from '@supabase/ssr'
import { getMissingEnvErrorMessage, getSupabasePublicEnv } from '@/lib/env'

export function createClient() {
  const supabaseEnv = getSupabasePublicEnv()

  if (!supabaseEnv) {
    throw new Error(getMissingEnvErrorMessage())
  }

  return createBrowserClient(
    supabaseEnv.url,
    supabaseEnv.publishableKey
  )
}
