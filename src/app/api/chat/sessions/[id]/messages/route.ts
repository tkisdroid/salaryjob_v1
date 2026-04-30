import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getAiChatResponse } from '@/lib/services/eduland-ai'
import { notifyAgents } from '@/lib/services/telegram'
import type { ChatHistoryItem } from '@/lib/services/eduland-ai'

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/chat/sessions/[id]/messages — fetch message history
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const session = await prisma.eduChatSession.findUnique({
      where: { id },
      select: { id: true, status: true, aiEnabled: true },
    })

    if (!session) {
      return NextResponse.json({ error: '상담 세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    const messages = await prisma.eduChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, source: true, createdAt: true },
    })

    return NextResponse.json({ messages, session })
  } catch (err) {
    console.error('[chat/messages GET]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST /api/chat/sessions/[id]/messages — send a user message and get AI response
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = SendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: '메시지 형식이 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    const { content } = parsed.data

    const session = await prisma.eduChatSession.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        aiEnabled: true,
        source: true,
        guestName: true,
        guestPhone: true,
        userId: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: '상담 세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (session.status === 'closed') {
      return NextResponse.json({ error: '종료된 상담입니다.' }, { status: 409 })
    }

    // Save user message
    await prisma.eduChatMessage.create({
      data: {
        sessionId: id,
        role: 'USER',
        content,
        source: session.source,
      },
    })

    // Fetch recent history for AI context (last 20 messages)
    const historyRows = await prisma.eduChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    })

    // Reverse to chronological; remove the last item (just-inserted USER message).
    // .slice(0, -1) on an empty array returns [] safely.
    const history: ChatHistoryItem[] = historyRows
      .reverse()
      .slice(0, -1)
      .filter((m) => m.role === 'USER' || m.role === 'AI')
      .map((m) => ({
        role: m.role === 'USER' ? 'user' : 'model',
        content: m.content,
      }))

    let aiText: string | null = null
    let needsAgent = false

    if (session.aiEnabled && session.status !== 'pending_agent') {
      const aiResult = await getAiChatResponse(content, history)

      if (aiResult.ok) {
        aiText = aiResult.text
        needsAgent = aiResult.needsAgent

        // Save AI response
        await prisma.eduChatMessage.create({
          data: {
            sessionId: id,
            role: 'AI',
            content: aiResult.text,
            source: session.source,
          },
        })

        // If AI flagged agent needed, escalate session
        if (needsAgent) {
          await prisma.eduChatSession.update({
            where: { id },
            data: { status: 'pending_agent', aiEnabled: false, updatedAt: new Date() },
          })
        }
      }
    }

    // Notify agents via Telegram on every user message
    await notifyAgents({
      sessionId: id,
      guestName: session.guestName,
      guestPhone: session.guestPhone,
      message: content,
      isGuest: !session.userId,
      source: session.source,
    })

    // Update session timestamp
    await prisma.eduChatSession.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      aiReply: aiText,
      needsAgent,
      status: needsAgent ? 'pending_agent' : session.status,
    })
  } catch (err) {
    console.error('[chat/messages POST]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
