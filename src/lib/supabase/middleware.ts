import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  canRoleAccessPath,
  getRouteRequirement,
  isPublicPath,
  type AppRole,
} from '@/lib/auth/routing'
import { getSupabasePublicEnv } from '@/lib/env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseEnv = getSupabasePublicEnv()
  if (!supabaseEnv) {
    return supabaseResponse
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    supabaseEnv.url,
    // CONTEXT.md D-07: primary key name is NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
    // Fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY for .env.local compatibility.
    supabaseEnv.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const path = request.nextUrl.pathname
  const nextPath = `${path}${request.nextUrl.search}`

  if (!user && !isPublicPath(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', nextPath)
    return NextResponse.redirect(url)
  }

  const role = user?.app_metadata?.role as AppRole | undefined
  const requirement = getRouteRequirement(path)

  if (requirement === 'worker' && role && !canRoleAccessPath(role, path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'worker_required')
    return NextResponse.redirect(url)
  }

  if (requirement === 'business' && role && !canRoleAccessPath(role, path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'business_required')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
