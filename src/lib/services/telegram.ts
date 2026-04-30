import 'server-only'

const BASE_URL = 'https://api.telegram.org/bot'

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null
}

function getAgentChatIds(): string[] {
  const raw = process.env.TELEGRAM_AGENT_CHAT_IDS?.trim()
  if (!raw) return []
  return raw.split(',').map((id) => id.trim()).filter(Boolean)
}

function getAppUrl(): string {
  return (
    process.env.CHATBOT_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:3000'
  )
}

async function sendMessage(chatId: string, text: string, parseMode?: 'HTML' | 'Markdown'): Promise<boolean> {
  const token = getBotToken()
  if (!token) return false

  try {
    const res = await fetch(`${BASE_URL}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode ?? 'HTML',
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      console.error('[telegram] sendMessage error:', res.status, await res.text())
    }
    return res.ok
  } catch (err) {
    console.error('[telegram] sendMessage exception:', err instanceof Error ? err.message : err)
    return false
  }
}

/**
 * Notify all configured agent Telegram chat IDs about a new consultation message.
 *
 * @param sessionId   Chat session UUID (used for deep-link to admin console)
 * @param guestName   User's name (may be member name or guest-entered name)
 * @param message     The message content
 * @param isGuest     Whether this is a guest (unregistered) user
 */
export async function notifyAgents(opts: {
  sessionId: string
  guestName?: string | null
  guestPhone?: string | null
  message: string
  isGuest: boolean
  source?: 'WEB' | 'KAKAO'
}): Promise<void> {
  const agentIds = getAgentChatIds()
  if (agentIds.length === 0) return

  const appUrl = getAppUrl()
  const adminLink = `${appUrl}/admin/chat/${opts.sessionId}`
  const sourceLabel = opts.source === 'KAKAO' ? '카카오' : '웹'
  const userLabel = opts.isGuest
    ? `👤 비회원 ${opts.guestName ? `(${opts.guestName})` : ''} ${opts.guestPhone ? `📞 ${opts.guestPhone}` : ''}`
    : `👤 회원`

  const text = [
    `📩 <b>새 상담 메시지 [${sourceLabel}]</b>`,
    ``,
    userLabel,
    `💬 ${opts.message}`,
    ``,
    `🔗 <a href="${adminLink}">상담 내역 보기</a>`,
    ``,
    `<i>답장하려면 위 링크에서 상담원 모드로 전환하거나 이 채팅에 /reply_${opts.sessionId.slice(0, 8)} [메시지] 로 응답하세요.</i>`,
  ].join('\n')

  await Promise.all(agentIds.map((id) => sendMessage(id, text, 'HTML')))
}

/**
 * Send an agent reply back to all agent chat IDs (broadcast confirmation).
 */
export async function broadcastAgentReply(opts: {
  sessionId: string
  agentMessage: string
}): Promise<void> {
  const agentIds = getAgentChatIds()
  if (agentIds.length === 0) return

  const text = `✅ <b>상담원 답변 전송됨</b> [${opts.sessionId.slice(0, 8)}]\n\n${opts.agentMessage}`
  await Promise.all(agentIds.map((id) => sendMessage(id, text, 'HTML')))
}

/**
 * Parse a Telegram webhook update to extract a /reply_{sessionPrefix} command.
 * Returns null if not a reply command.
 */
export function parseReplyCommand(text: string): { sessionPrefix: string; message: string } | null {
  const match = text.match(/^\/reply_([a-f0-9]{8})\s+([\s\S]+)$/)
  if (!match) return null
  return { sessionPrefix: match[1], message: match[2].trim() }
}

export function isTelegramEnabled(): boolean {
  return Boolean(getBotToken())
}
