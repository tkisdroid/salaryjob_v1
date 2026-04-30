import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/db'

const CreateSessionSchema = z.object({
  guestName: z.string().min(1).max(50).optional(),
  guestPhone: z.string().min(9).max(20).optional(),
  guestEmail: z.string().email().max(100).optional(),
  source: z.enum(['WEB', 'KAKAO']).default('WEB'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = CreateSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: '요청 형식이 올바르지 않습니다.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { guestName, guestPhone, guestEmail, source } = parsed.data

    // Try to get logged-in user ID from Supabase session
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
    } catch {
      // Guest session — no auth required
    }

    const session = await prisma.eduChatSession.create({
      data: {
        userId: userId ?? undefined,
        guestName: userId ? undefined : guestName,
        guestPhone: userId ? undefined : guestPhone,
        guestEmail: userId ? undefined : guestEmail,
        source,
        status: 'open',
        aiEnabled: true,
      },
      select: {
        id: true,
        status: true,
        aiEnabled: true,
        source: true,
        guestName: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ session }, { status: 201 })
  } catch (err) {
    console.error('[chat/sessions POST]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
