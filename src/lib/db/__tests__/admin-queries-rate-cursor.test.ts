/**
 * Regression test for Issue 4 (Codex finding) — admin-queries rate_* cursor.
 *
 * Run with: npx vitest run src/lib/db/__tests__/admin-queries-rate-cursor.test.ts
 *
 * Requires DATABASE_URL to be set. Tests are skipped automatically when no DB
 * is available (conditional skip pattern below).
 *
 * Covers:
 *   1. rate_desc paginates without skip or duplication across NULL boundary
 *   2. rate_asc tie-break is deterministic (no duplication with shared commissionRate)
 *   3. Malformed cursor degrades to first page (no throw)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { getBusinessesPaginated } from '@/lib/db/admin-queries'

// ---------------------------------------------------------------------------
// Test seed config
// ---------------------------------------------------------------------------
const TEST_PREFIX = 'CURSOR_TEST_'

// We need a real userId to satisfy FK constraints. We'll use a fixed UUID and
// create a stub user row if it doesn't exist, then clean up after all tests.
const TEST_USER_ID = '00000000-1111-2222-3333-000000000099'

type SeedRow = {
  name: string
  commissionRate: string | null
  createdAtOffset: number // ms offset from base time for deterministic ordering
}

const RATE_DESC_SEEDS: SeedRow[] = [
  { name: `${TEST_PREFIX}A`, commissionRate: '0.10', createdAtOffset: 0 },
  { name: `${TEST_PREFIX}B`, commissionRate: '0.08', createdAtOffset: 1000 },
  { name: `${TEST_PREFIX}C`, commissionRate: null,   createdAtOffset: 2000 },
  { name: `${TEST_PREFIX}D`, commissionRate: '0.05', createdAtOffset: 3000 },
  { name: `${TEST_PREFIX}E`, commissionRate: null,   createdAtOffset: 4000 },
]

// For tie-break test: two rows share commissionRate=0.05
const RATE_ASC_SEEDS: SeedRow[] = [
  { name: `${TEST_PREFIX}TIE1`, commissionRate: '0.05', createdAtOffset: 0 },
  { name: `${TEST_PREFIX}TIE2`, commissionRate: '0.05', createdAtOffset: 1000 },
  { name: `${TEST_PREFIX}HIGH`, commissionRate: '0.20', createdAtOffset: 2000 },
  { name: `${TEST_PREFIX}NULL`, commissionRate: null,   createdAtOffset: 3000 },
]

const BASE_TIME = new Date('2025-01-01T00:00:00.000Z')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let dbAvailable = true

async function checkDb(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

async function ensureTestUser() {
  // Upsert a minimal user record so FK constraints on BusinessProfile are satisfied.
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      role: 'BUSINESS',
    },
  })
}

async function seedProfiles(seeds: SeedRow[]): Promise<string[]> {
  const ids: string[] = []
  for (const s of seeds) {
    const created = await prisma.businessProfile.create({
      data: {
        userId: TEST_USER_ID,
        name: s.name,
        category: 'food',
        address: 'Test address',
        lat: 37.5,
        lng: 127.0,
        commissionRate: s.commissionRate ? s.commissionRate : null,
        createdAt: new Date(BASE_TIME.getTime() + s.createdAtOffset),
      },
      select: { id: true },
    })
    ids.push(created.id)
  }
  return ids
}

async function cleanupTestProfiles() {
  await prisma.businessProfile.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('getBusinessesPaginated rate_* cursor', () => {
  beforeAll(async () => {
    dbAvailable = await checkDb()
    if (!dbAvailable) return

    await ensureTestUser()
    await cleanupTestProfiles() // remove any leftovers from prior failed run
  })

  afterAll(async () => {
    if (!dbAvailable) return
    await cleanupTestProfiles()
  })

  it('rate_desc paginates without skip or duplication across NULL boundary', async () => {
    if (!dbAvailable) {
      console.warn('DB not available — skipping rate_desc pagination test')
      return
    }

    await seedProfiles(RATE_DESC_SEEDS)

    const seen = new Set<string>()
    let cursor: string | null = null
    let pages = 0

    do {
      const { items, nextCursor } = await getBusinessesPaginated({
        sort: 'rate_desc',
        limit: 2,
        cursor,
        q: TEST_PREFIX,
        field: 'name',
      })

      for (const item of items) {
        expect(seen.has(item.id), `Duplicate id ${item.id} on page ${pages + 1}`).toBe(false)
        seen.add(item.id)
      }

      cursor = nextCursor
      pages++
    } while (cursor && pages < 10)

    // All 5 rows returned, none skipped, none duplicated
    expect(seen.size).toBe(5)

    await cleanupTestProfiles()
  })

  it('rate_asc tie-break is deterministic (no duplication with shared commissionRate)', async () => {
    if (!dbAvailable) {
      console.warn('DB not available — skipping rate_asc tie-break test')
      return
    }

    await seedProfiles(RATE_ASC_SEEDS)

    const seen = new Set<string>()
    let cursor: string | null = null
    let pages = 0

    do {
      const { items, nextCursor } = await getBusinessesPaginated({
        sort: 'rate_asc',
        limit: 2,
        cursor,
        q: TEST_PREFIX,
        field: 'name',
      })

      for (const item of items) {
        expect(seen.has(item.id), `Duplicate id ${item.id} on page ${pages + 1}`).toBe(false)
        seen.add(item.id)
      }

      cursor = nextCursor
      pages++
    } while (cursor && pages < 10)

    // All 4 rows returned, none skipped, none duplicated
    expect(seen.size).toBe(4)

    await cleanupTestProfiles()
  })

  it('malformed cursor degrades to first page (no throw)', async () => {
    if (!dbAvailable) {
      console.warn('DB not available — skipping malformed cursor test')
      return
    }

    // 'garbage_no_prefix' has no 'r:' prefix → decodeRateCursor returns null
    // → cursorWhere is undefined → query returns first page without error
    const { items } = await getBusinessesPaginated({
      sort: 'rate_desc',
      limit: 2,
      cursor: 'garbage_no_prefix',
      q: TEST_PREFIX,
      field: 'name',
    })

    expect(Array.isArray(items)).toBe(true)
    // No throw — the function completes normally
  })
})
