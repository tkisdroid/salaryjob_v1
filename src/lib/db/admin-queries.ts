import 'server-only'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import type { JobCategory } from '@/generated/prisma/client'
import { normalizeDigits } from '@/lib/strings'

// ============================================================================
// Types
// ============================================================================

export type BusinessListRow = {
  id: string
  name: string
  businessRegNumber: string | null
  ownerName: string | null
  ownerPhone: string | null
  verified: boolean
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  category: JobCategory
}

export type BusinessListArgs = {
  q?: string
  field?: 'name' | 'reg' | 'owner' | 'phone'
  verified?: 'all' | 'yes' | 'no'
  sort?: 'created_desc' | 'created_asc' | 'rate_desc' | 'rate_asc'
  cursor?: string | null
  limit?: number
}

// ============================================================================
// Cursor encode / decode
//
// Format: "{createdAtISO}_{uuid}"
// e.g.   "2026-04-13T08:00:00.000Z_550e8400-e29b-41d4-a716-446655440000"
//
// Used for both created_* sorts and rate_* sorts (rate ties are rare; we
// always cursor on createdAt+id for stability — RESEARCH §Pattern 2).
// ============================================================================

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}_${row.id}`
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  // ISO datetime is 24 chars + underscore + UUID (36 chars) = 61 chars
  if (cursor.length < 38) return null
  const underscoreIdx = cursor.indexOf('_', 20) // ISO date has no underscore in first 20 chars
  if (underscoreIdx === -1) return null
  const iso = cursor.slice(0, underscoreIdx)
  const id = cursor.slice(underscoreIdx + 1)
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  return { createdAt: d, id }
}

// ============================================================================
// getBusinessesPaginated
//
// D-40: ILIKE search on name / businessRegNumber / ownerName / ownerPhone
//   - reg search: normalize dashes via normalizeDigits()
// D-41: verified filter — yes/no/all
// D-42: sort — created_desc | created_asc | rate_desc | rate_asc
// D-43: cursor pagination (limit+1 trick), default 20, max 100
// T-06-13: all user input through Prisma parameterized; q length clamped ≤100
// ============================================================================

export async function getBusinessesPaginated(
  args: BusinessListArgs,
): Promise<{ items: BusinessListRow[]; nextCursor: string | null }> {
  const limit = Math.min(args.limit ?? 20, 100)
  const sort = args.sort ?? 'created_desc'
  const field = args.field ?? 'name'
  const verifiedFilter = args.verified ?? 'all'

  // T-06-13: clamp query length to 100 characters
  const q = args.q ? args.q.slice(0, 100).trim() : ''

  // ------------------------------------------------------------------
  // Build search where clause
  // ------------------------------------------------------------------
  let searchWhere: Prisma.BusinessProfileWhereInput | undefined
  if (q) {
    if (field === 'name') {
      searchWhere = { name: { contains: q, mode: 'insensitive' } }
    } else if (field === 'reg') {
      // D-40: strip dashes from query, then ILIKE against digit-only stored value
      const normalized = normalizeDigits(q)
      if (normalized) {
        searchWhere = {
          businessRegNumber: { contains: normalized, mode: 'insensitive' },
        }
      }
    } else if (field === 'owner') {
      searchWhere = { ownerName: { contains: q, mode: 'insensitive' } }
    } else if (field === 'phone') {
      // D-40: normalize digits for phone search too
      const normalized = normalizeDigits(q)
      const phoneQ = normalized || q
      searchWhere = { ownerPhone: { contains: phoneQ, mode: 'insensitive' } }
    }
  }

  // ------------------------------------------------------------------
  // Build verified filter
  // ------------------------------------------------------------------
  let verifiedWhere: Prisma.BusinessProfileWhereInput | undefined
  if (verifiedFilter === 'yes') {
    verifiedWhere = { verified: true }
  } else if (verifiedFilter === 'no') {
    verifiedWhere = { verified: false }
  }

  // ------------------------------------------------------------------
  // Build cursor filter
  //
  // For desc sorts: items BEFORE cursor (tuple < cursor means older)
  //   createdAt < cursorDate  OR  (createdAt = cursorDate AND id < cursorId)
  // For asc sorts: items AFTER cursor (tuple > cursor means newer)
  //   createdAt > cursorDate  OR  (createdAt = cursorDate AND id > cursorId)
  //
  // rate_* sorts still cursor on createdAt+id for stability (D-43 RESEARCH §Pattern 2)
  // ------------------------------------------------------------------
  const decoded = args.cursor ? decodeCursor(args.cursor) : null
  let cursorWhere: Prisma.BusinessProfileWhereInput | undefined

  if (decoded) {
    const isAsc = sort === 'created_asc' || sort === 'rate_asc'
    if (isAsc) {
      cursorWhere = {
        OR: [
          { createdAt: { gt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { gt: decoded.id } },
        ],
      }
    } else {
      cursorWhere = {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { lt: decoded.id } },
        ],
      }
    }
  }

  // ------------------------------------------------------------------
  // Build orderBy
  //
  // rate_* nulls: nulls: 'last' keeps NULLs at the bottom consistently
  // regardless of asc/desc — chosen for business admin UX (override rates
  // shown first, global-default businesses grouped at the end).
  // ------------------------------------------------------------------
  let orderBy: Prisma.BusinessProfileOrderByWithRelationInput[]
  switch (sort) {
    case 'created_asc':
      orderBy = [{ createdAt: 'asc' }, { id: 'asc' }]
      break
    case 'rate_desc':
      orderBy = [
        { commissionRate: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ]
      break
    case 'rate_asc':
      orderBy = [
        { commissionRate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ]
      break
    case 'created_desc':
    default:
      orderBy = [{ createdAt: 'desc' }, { id: 'desc' }]
  }

  // ------------------------------------------------------------------
  // Combine where clauses
  // ------------------------------------------------------------------
  const where: Prisma.BusinessProfileWhereInput = {
    AND: [
      ...(searchWhere ? [searchWhere] : []),
      ...(verifiedWhere ? [verifiedWhere] : []),
      ...(cursorWhere ? [cursorWhere] : []),
    ],
  }

  // ------------------------------------------------------------------
  // Fetch limit+1 to detect next page
  // ------------------------------------------------------------------
  const rows = await prisma.businessProfile.findMany({
    where,
    orderBy,
    take: limit + 1,
    select: {
      id: true,
      name: true,
      businessRegNumber: true,
      ownerName: true,
      ownerPhone: true,
      verified: true,
      commissionRate: true,
      createdAt: true,
      category: true,
    },
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const nextCursor =
    hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1])
      : null

  return { items, nextCursor }
}

// ============================================================================
// getBusinessById
//
// Full detail for admin view — includes user account + job count.
// T-06-15: callers must call requireAdmin() before invoking this.
// ============================================================================

export async function getBusinessById(id: string): Promise<{
  id: string
  name: string
  category: JobCategory
  address: string
  addressDetail: string | null
  businessRegNumber: string | null
  ownerName: string | null
  ownerPhone: string | null
  businessRegImageUrl: string | null
  commissionRate: Prisma.Decimal | null
  verified: boolean
  createdAt: Date
  user: { id: string; email: string | null; phone: string | null }
  _counts: { jobs: number }
} | null> {
  const biz = await prisma.businessProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, phone: true },
      },
      _count: {
        select: { jobs: true },
      },
    },
  })

  if (!biz) return null

  return {
    id: biz.id,
    name: biz.name,
    category: biz.category,
    address: biz.address,
    addressDetail: biz.addressDetail,
    businessRegNumber: biz.businessRegNumber,
    ownerName: biz.ownerName,
    ownerPhone: biz.ownerPhone,
    businessRegImageUrl: biz.businessRegImageUrl,
    commissionRate: biz.commissionRate,
    verified: biz.verified,
    createdAt: biz.createdAt,
    user: biz.user,
    _counts: { jobs: biz._count.jobs },
  }
}
