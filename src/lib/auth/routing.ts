export type AppRole = 'WORKER' | 'BUSINESS' | 'BOTH' | 'ADMIN'

type RouteRequirement = 'worker' | 'business' | null

const WORKER_PREFIXES = [
  '/home',
  '/my',
  '/explore',
  '/search',
  '/notifications',
  '/apply',
  '/chat',
]
const BUSINESS_PREFIXES = ['/biz']
const AUTH_PREFIXES = ['/auth']
const PUBLIC_POST_DETAIL_ROUTE = /^\/posts\/[^/]+$/
const WORKER_POST_APPLY_ROUTE = /^\/posts\/[^/]+\/apply(?:\/.*)?$/

function startsWithSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isAuthPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/signup' ||
    AUTH_PREFIXES.some((prefix) => startsWithSegment(path, prefix))
  )
}

export function isPublicPostPath(path: string): boolean {
  if (path === '/posts/new') return false
  return PUBLIC_POST_DETAIL_ROUTE.test(path)
}

export function isPublicPath(path: string): boolean {
  return path === '/' || isAuthPath(path) || isPublicPostPath(path)
}

export function getRouteRequirement(path: string): RouteRequirement {
  if (path === '/posts/new' || WORKER_POST_APPLY_ROUTE.test(path)) return 'worker'
  if (WORKER_PREFIXES.some((prefix) => startsWithSegment(path, prefix))) return 'worker'
  if (BUSINESS_PREFIXES.some((prefix) => startsWithSegment(path, prefix))) return 'business'
  return null
}

export function canRoleAccessPath(
  role: AppRole | null | undefined,
  path: string,
): boolean {
  const requirement = getRouteRequirement(path)
  if (!requirement) return true
  if (!role) return false
  if (role === 'ADMIN' || role === 'BOTH') return true
  if (requirement === 'worker') return role === 'WORKER'
  return role === 'BUSINESS'
}

export function getDefaultPathForRole(role: AppRole | null | undefined): string {
  if (role === 'BUSINESS' || role === 'ADMIN') return '/biz'
  if (role === 'WORKER' || role === 'BOTH') return '/home'
  return '/role-select'
}

export function resolveNextPath(
  raw: FormDataEntryValue | string | null | undefined,
): string | null {
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null

  try {
    const url = new URL(trimmed, 'http://localhost')
    if (url.origin !== 'http://localhost') return null
    if (isAuthPath(url.pathname)) return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function getPostAuthRedirectPath(
  role: AppRole | null | undefined,
  rawNext: FormDataEntryValue | string | null | undefined,
): string {
  const nextPath = resolveNextPath(rawNext)
  if (nextPath && canRoleAccessPath(role, nextPath)) {
    return nextPath
  }
  return getDefaultPathForRole(role)
}

export function buildLoginHref(nextPath: string): string {
  return `/login?next=${encodeURIComponent(nextPath)}`
}
