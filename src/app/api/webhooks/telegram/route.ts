import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { parseReplyCommand } from '@/lib/services/telegram'

/**
 * Telegram bot webhook — receives incoming messages/commands from agents.
 *
 * Agents can reply to a consultation using:
 *   /reply_{sessionId_first_8_chars} 답변 내용
 *
 * Setup: Set this URL as your Telegram bot webhook:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/webhooks/telegram
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }) // always 200 to Telegram
  }

  try {
    const message = body?.message as Record<string, unknown> | undefined
    const text = typeof message?.text === 'string' ? message.text.trim() : ''

    if (!text) return NextResponse.json({ ok: true })

    const parsed = parseReplyCommand(text)
    if (!parsed) return NextResponse.json({ ok: true })

    const { sessionPrefix, message: agentMessage } = parsed

    // Find the session by UUID prefix using raw SQL cast
    type SessionRow = { id: string }
    const rows = await prisma.$queryRaw<SessionRow[]>`
      SELECT id FROM edu_chat_sessions
      WHERE id::text LIKE ${sessionPrefix + '%'}
        AND status != 'closed'
      LIMIT 1
    `
    if (!rows[0]) return NextResponse.json({ ok: true })

    const session = await prisma.eduChatSession.findUnique({
      where: { id: rows[0].id },
      select: { id: true, status: true, source: true },
    })
    if (!session) return NextResponse.json({ ok: true })

    // Save agent message
    await prisma.eduChatMessage.create({
      data: {
        sessionId: session.id,
        role: 'AGENT',
        content: agentMessage,
        source: session.source,
      },
    })

    // Update session status — agent has responded
    await prisma.eduChatSession.update({
      where: { id: session.id },
      data: {
        status: 'pending_agent',
        aiEnabled: false,
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('[telegram-webhook]', err)
    // Always return 200 to prevent Telegram from retrying
  }

  return NextResponse.json({ ok: true })
}
