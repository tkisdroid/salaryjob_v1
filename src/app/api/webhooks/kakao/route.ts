import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAiChatResponse } from '@/lib/services/eduland-ai'
import { notifyAgents } from '@/lib/services/telegram'
import type { ChatHistoryItem } from '@/lib/services/eduland-ai'

/**
 * Kakao i Open Builder skill endpoint.
 *
 * Kakao POSTs a JSON body every time the user sends a message in the
 * connected KakaoTalk chatbot channel. We respond with the Kakao SimpleText
 * response format.
 *
 * Docs: https://i.kakao.com/docs/skill-response-format#simpletext
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract user message and Kakao user key from payload
  const userRequest = body?.userRequest as Record<string, unknown> | undefined
  const utterance = typeof userRequest?.utterance === 'string' ? userRequest.utterance.trim() : ''
  const kakaoUserId = typeof userRequest?.user === 'object'
    ? ((userRequest.user as Record<string, unknown>)?.id as string | undefined) ?? null
    : null

  if (!utterance) {
    return NextResponse.json(kakaoTextResponse('메시지를 입력해 주세요.'))
  }

  try {
    // Find or create a session for this Kakao user
    let session = kakaoUserId
      ? await prisma.eduChatSession.findFirst({
          where: { kakaoUserId, status: { not: 'closed' } },
          orderBy: { createdAt: 'desc' },
        })
      : null

    if (!session) {
      session = await prisma.eduChatSession.create({
        data: {
          kakaoUserId: kakaoUserId ?? undefined,
          source: 'KAKAO',
          status: 'open',
          aiEnabled: true,
        },
      })
    }

    // Save user message
    await prisma.eduChatMessage.create({
      data: { sessionId: session.id, role: 'USER', content: utterance, source: 'KAKAO' },
    })

    // Build history for AI
    const historyRows = await prisma.eduChatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { role: true, content: true },
    })

    // Reverse to chronological; remove the last item (just-inserted USER message
    // which is already the current utterance — not part of prior context).
    // .slice(0, -1) on an empty array returns [] safely.
    const history: ChatHistoryItem[] = historyRows
      .reverse()
      .slice(0, -1)
      // Exclude AGENT messages from AI context — they are human-written and
      // should not be treated as model output in the Gemini conversation.
      .filter((m) => m.role === 'USER' || m.role === 'AI')
      .map((m) => ({ role: m.role === 'USER' ? 'user' : 'model', content: m.content }))

    let replyText = '잠시 후 상담원이 연결됩니다.'
    let needsAgent = false

    if (session.aiEnabled) {
      const aiResult = await getAiChatResponse(utterance, history)
      if (aiResult.ok) {
        replyText = aiResult.text
        needsAgent = aiResult.needsAgent

        await prisma.eduChatMessage.create({
          data: { sessionId: session.id, role: 'AI', content: aiResult.text, source: 'KAKAO' },
        })

        if (needsAgent) {
          await prisma.eduChatSession.update({
            where: { id: session.id },
            data: { status: 'pending_agent', aiEnabled: false, updatedAt: new Date() },
          })
          replyText += '\n\n상담원 연결을 요청했습니다. 잠시만 기다려 주세요.'
        }
      }
    }

    // Notify Telegram agents
    await notifyAgents({
      sessionId: session.id,
      guestName: session.guestName,
      guestPhone: session.guestPhone,
      message: utterance,
      isGuest: !session.userId,
      source: 'KAKAO',
    })

    await prisma.eduChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json(kakaoTextResponse(replyText))
  } catch (err) {
    console.error('[kakao-webhook]', err)
    return NextResponse.json(
      kakaoTextResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'),
    )
  }
}

function kakaoTextResponse(text: string) {
  return {
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: { text },
        },
      ],
    },
  }
}
