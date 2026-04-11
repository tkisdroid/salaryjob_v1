import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // CONTEXT.md D-07: primary key name is NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
    // Fallback to NEXT_PUBLIC_SUPABASE_ANON_KEY for .env.local compatibility.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // @supabase/ssr's setAll callback accepts a single argument.
        // Previously this code declared a second `headers` parameter and then
        // called `Object.entries(headers).forEach(...)` on it. Because
        // @supabase/ssr never passes a second argument, `headers` was
        // undefined and `Object.entries(undefined)` threw a TypeError the
        // moment Supabase tried to refresh an expiring access token.
        // The crash killed the middleware request silently, the refreshed
        // cookies never reached the browser, and the next navigation
        // showed the user as logged out — observed as "worker가 원탭지원
        // 누르면 다시 로그아웃된 상태로 로그인 페이지로 감".
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

  // GigNow-specific role-based protection
  const path = request.nextUrl.pathname
  const isAuthPublic =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth') ||
    path.startsWith('/posts/') ||
    path === '/'

  if (!user && !isAuthPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Role-based optimistic check (re-verify in page/action via DAL!)
  const role = user?.app_metadata?.role as
    | 'WORKER'
    | 'BUSINESS'
    | 'BOTH'
    | 'ADMIN'
    | undefined

  // Worker routes: verified against actual src/app/(worker)/ directory (2026-04-10)
  // DO NOT add /schedule, /settlements, /applications, /availability — those directories do not exist
  const workerPrefixes = [
    '/home',
    '/my',
    '/explore',
    '/search',
    '/notifications',
    '/apply',
    '/chat',
    '/posts',
  ]
  const bizPrefixes = ['/biz']

  const needsWorker = workerPrefixes.some((p) => path.startsWith(p))
  const needsBiz = bizPrefixes.some((p) => path.startsWith(p))

  if (needsWorker && role && role !== 'WORKER' && role !== 'BOTH' && role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'worker_required')
    return NextResponse.redirect(url)
  }
  if (needsBiz && role && role !== 'BUSINESS' && role !== 'BOTH' && role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'business_required')
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
