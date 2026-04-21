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
// created_* sorts — format: "{createdAtISO}_{uuid}"
// e.g.   "2026-04-13T08:00:00.000Z_550e8400-e29b-41d4-a716-446655440000"
//
// rate_* sorts — format: "r:{rateOrNULL}_{createdAtISO}_{uuid}"
// e.g.   "r:0.0500_2026-04-13T08:00:00.000Z_550e8400-e29b-41d4-a716-446655440000"
//      or "r:NULL_2026-04-13T08:00:00.000Z_550e8400-e29b-41d4-a716-446655440000"
//
// rate_* sorts use composite (commissionRate, createdAt, id) cursor; created_* sorts
// use (createdAt, id). Encoder/decoder selected by sort type.
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

// Composite cursor for rate_* sorts: rate (Decimal | null) + createdAt + id
function encodeRateCursor(row: {
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  id: string
}): string {
  const rateStr = row.commissionRate === null ? 'NULL' : row.commissionRate.toString()
  return `r:${rateStr}_${row.createdAt.toISOString()}_${row.id}`
}

function decodeRateCursor(cursor: string): {
  commissionRate: Prisma.Decimal | null
  createdAt: Date
  id: string
} | null {
  if (!cursor.startsWith('r:')) return null
  const body = cursor.slice(2)
  // Find the FIRST underscore (separates rate from createdAtISO).
  // Rate is either 'NULL' or a decimal like '0.0500' — neither contains underscore.
  const firstUnderscore = body.indexOf('_')
  if (firstUnderscore === -1) return null
  const ratePart = body.slice(0, firstUnderscore)
  const rest = body.slice(firstUnderscore + 1)
  // Reuse decodeCursor logic for the createdAt+id portion
  const restDecoded = decodeCursor(rest)
  if (!restDecoded) return null
  let commissionRate: Prisma.Decimal | null
  if (ratePart === 'NULL') {
    commissionRate = null
  } else {
    try {
      commissionRate = new Prisma.Decimal(ratePart)
    } catch {
      return null
    }
  }
  return { commissionRate, createdAt: restDecoded.createdAt, id: restDecoded.id }
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
  // For desc sorts: items BEFORE cursor (tuple < cursor means older/smaller)
  // For asc sorts: items AFTER cursor (tuple > cursor means newer/larger)
  //
  // rate_* sorts use composite (commissionRate, createdAt, id) cursor;
  // created_* sorts use (createdAt, id). Encoder/decoder selected by sort type.
  // ------------------------------------------------------------------
  const isRateSort = sort === 'rate_desc' || sort === 'rate_asc'
  const isAsc = sort === 'created_asc' || sort === 'rate_asc'

  let cursorWhere: Prisma.BusinessProfileWhereInput | undefined

  if (args.cursor) {
    if (isRateSort) {
      const dec = decodeRateCursor(args.cursor)
      if (dec) {
        // ORDER BY commissionRate {sort} NULLS LAST, createdAt {sort}, id {sort}
        // NULLS LAST means nulls sort after all non-null values regardless of asc/desc.
        //   - If cursor's rate is non-null:
        //       desc: next page = (rate < cursorRate) OR (rate = cursorRate AND tuple<) OR (rate IS NULL)
        //       asc : next page = (rate > cursorRate) OR (rate = cursorRate AND tuple>) OR (rate IS NULL)
        //   - If cursor's rate is null (we're already in the NULL-tail page):
        //       both: next page = (rate IS NULL) AND tuple comparison
        if (dec.commissionRate === null) {
          // We're in the NULL tail — paginate by (createdAt, id) only, within nulls
          cursorWhere = {
            commissionRate: null,
            OR: isAsc
              ? [
                  { createdAt: { gt: dec.createdAt } },
                  { createdAt: dec.createdAt, id: { gt: dec.id } },
                ]
              : [
                  { createdAt: { lt: dec.createdAt } },
                  { createdAt: dec.createdAt, id: { lt: dec.id } },
                ],
          }
        } else {
          const rateCmp = isAsc ? { gt: dec.commissionRate } : { lt: dec.commissionRate }
          const tupleCmp = isAsc
            ? [
                { createdAt: { gt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { gt: dec.id } },
              ]
            : [
                { createdAt: { lt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { lt: dec.id } },
              ]
          cursorWhere = {
            OR: [
              { commissionRate: rateCmp },
              { commissionRate: dec.commissionRate, OR: tupleCmp },
              { commissionRate: null }, // NULLS LAST → always after non-null pages
            ],
          }
        }
      }
      // malformed rate cursor (no 'r:' prefix or decode failure) → no cursorWhere → first page
    } else {
      const dec = decodeCursor(args.cursor)
      if (dec) {
        cursorWhere = isAsc
          ? {
              OR: [
                { createdAt: { gt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { gt: dec.id } },
              ],
            }
          : {
              OR: [
                { createdAt: { lt: dec.createdAt } },
                { createdAt: dec.createdAt, id: { lt: dec.id } },
              ],
            }
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
      ? (isRateSort
          ? encodeRateCursor(items[items.length - 1])
          : encodeCursor(items[items.length - 1]))
      : null

  return { items, nextCursor }
}

// ============================================================================
// getAdminSettlements
//
// Paginated list of all settled/completed applications for admin oversight.
// T-06-15: callers must call requireAdmin() before invoking this.
// ============================================================================

export async function getAdminSettlements(opts: {
  limit?: number
  offset?: number
}): Promise<{
  items: Array<{
    id: string
    jobTitle: string
    businessName: string
    workerName: string
    earnings: number
    netEarnings: number | null
    commissionAmount: number | null
    checkOutAt: Date | null
    status: string
  }>
  total: number
}> {
  const limit = Math.min(opts.limit ?? 20, 100)
  const offset = opts.offset ?? 0

  const where = {
    status: { in: ['settled' as const, 'completed' as const] },
  }

  const [rows, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { checkOutAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        status: true,
        earnings: true,
        netEarnings: true,
        commissionAmount: true,
        checkOutAt: true,
        job: {
          select: {
            title: true,
            business: { select: { name: true } },
          },
        },
        worker: {
          select: {
            workerProfile: { select: { name: true } },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ])

  return {
    items: rows.map((row) => ({
      id: row.id,
      jobTitle: row.job.title,
      businessName: row.job.business.name,
      workerName: row.worker.workerProfile?.name ?? '-',
      earnings: row.earnings ?? 0,
      netEarnings: row.netEarnings,
      commissionAmount: row.commissionAmount,
      checkOutAt: row.checkOutAt,
      status: row.status,
    })),
    total,
  }
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
