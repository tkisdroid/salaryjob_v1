import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { requireAdmin } from '@/lib/dal'
import { broadcastAgentReply } from '@/lib/services/telegram'

const ReplySchema = z.object({
  content: z.string().min(1).max(2000),
  closeSession: z.boolean().optional().default(false),
})

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/chat/sessions/[id]/agent-reply — admin agent sends a manual reply
export async function POST(req: NextRequest, { params }: RouteParams) {
  // Require admin auth
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = ReplySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    const { content, closeSession } = parsed.data

    const session = await prisma.eduChatSession.findUnique({
      where: { id },
      select: { id: true, status: true, source: true },
    })

    if (!session) {
      return NextResponse.json({ error: '상담 세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.status === 'closed') {
      return NextResponse.json({ error: '이미 종료된 상담입니다.' }, { status: 409 })
    }

    // Save agent message
    await prisma.eduChatMessage.create({
      data: {
        sessionId: id,
        role: 'AGENT',
        content,
        source: session.source,
      },
    })

    // Update session
    await prisma.eduChatSession.update({
      where: { id },
      data: {
        status: closeSession ? 'closed' : 'pending_agent',
        aiEnabled: false,
        updatedAt: new Date(),
      },
    })

    // Broadcast to other agents via Telegram
    await broadcastAgentReply({ sessionId: id, agentMessage: content })

    return NextResponse.json({ ok: true, closed: closeSession })
  } catch (err) {
    console.error('[agent-reply POST]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
