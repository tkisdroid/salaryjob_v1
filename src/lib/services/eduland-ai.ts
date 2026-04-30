// server-only: never import this from a client component
import 'server-only'

export interface ChatHistoryItem {
  role: 'user' | 'model'
  content: string
}

export type AiChatResult =
  | { ok: true; text: string; needsAgent: boolean }
  | { ok: false; reason: 'missing_api_key' | 'api_error' | 'timeout' | 'unparseable' }

// ---------------------------------------------------------------------------
// System prompt — Eduland 공인중개사 exam prep platform
// Covers the top inquiry categories derived from ~1,390 consultation records:
//   1. 구독연장 (subscription extension)
//   2. 합격환급 vs 환불 (critical disambiguation — see below)
//   3. 결제/수강료 (payment/pricing)
//   4. 교재배송 (textbook delivery)
//   5. 기타 일반문의
//
// Critical disambiguation:
//   합격환급(합격보장 환급) = merit cashback paid TO the student AFTER they PASS
//                            the exam. This is a reward/incentive program.
//   환불               = cancellation refund paid BACK to the student who
//                            STOPS coursework before completing or failing.
//
//   Many students use "환불" when they actually mean "합격환급".
//   The AI must clarify this via conversational context, not keyword matching.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `당신은 에듀랜드(eduland.kr)의 공인중개사 시험 준비 전문 AI 상담사입니다.
에듀랜드는 공인중개사 시험 대비 온라인 강의 플랫폼입니다.

[역할]
- 수강생의 문의를 친절하고 정확하게 안내합니다.
- 한국어로만 응답합니다.
- 항상 존댓말을 사용합니다.
- 확실하지 않은 사항은 상담원 연결을 권유합니다.

[핵심 구분 - 반드시 아래 두 개념을 혼동하지 마세요]
1. 합격환급(합격보장 환급): 수강생이 공인중개사 시험에 합격했을 때 에듀랜드에서 수강료를 돌려드리는 환급 제도입니다.
   - "합격하면 환불 받을 수 있나요?", "환급 신청은 어떻게 하나요?" → 합격환급 문의
   - 합격 후 영수증, 합격증 제출 필요
2. 환불(수강 취소 환불): 강의 수강을 중단하거나 취소할 경우 결제금액의 일부를 돌려드리는 절차입니다.
   - "강의 그만 듣고 싶어요", "환불 받고 싶어요" → 먼저 합격환급인지 환불인지 확인 질문 필요

[주요 FAQ]
- 구독연장: 수강기간 만료 전에 마이페이지 > 수강연장 메뉴에서 신청 가능합니다.
- 교재배송: 주문 후 평균 3~5 영업일 소요. 배송 현황은 홈페이지 로그인 후 마이페이지에서 확인 가능합니다.
- 결제/환불: 구체적인 금액/날짜는 확인 후 안내 필요 → 상담원 연결 권유
- 수강료: 과목별 상이, 패키지 할인 상품 있음. 자세한 가격은 홈페이지 강의 목록에서 확인 가능합니다.

[대화 규칙]
- 처음 만나는 비회원에게는 이름과 연락처(전화번호)를 정중하게 요청하세요.
- "환불"이라는 단어가 나오면 반드시 "수강 취소 환불"인지 "합격 후 환급"인지 먼저 확인하세요.
- 구체적인 계좌번호, 주민등록번호 등 민감한 개인정보는 이 채팅에서 받지 마세요.
- 답변하기 어려운 문의(이의신청, 법적 사항, 복잡한 환불 계산 등)는 아래 안내를 포함하세요:
  "[상담원연결필요]"

[상담원 연결 기준]
다음 상황에서는 반드시 "[상담원연결필요]"를 응답에 포함하세요:
- 복잡한 환불/환급 계산이 필요한 경우
- 수강 이력 확인이 필요한 경우
- 민원/불만 상황
- 기술적 오류/결제 오류
- 사용자가 직접 상담원 연결을 요청하는 경우`

/**
 * Send a message to Gemini and get a chat response.
 * Uses the same direct REST API pattern as the existing OCR module.
 *
 * @param userMessage   Latest user message
 * @param history       Previous messages (user/model pairs) for context
 * @returns AiChatResult with response text and needsAgent flag
 */
export async function getAiChatResponse(
  userMessage: string,
  history: ChatHistoryItem[] = [],
): Promise<AiChatResult> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return { ok: false, reason: 'missing_api_key' }
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25_000)

  try {
    // Build contents array: history + current message
    const contents = [
      ...history.map((h) => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: userMessage }],
      },
    ]

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`

    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      console.error('[eduland-ai] Gemini API error:', res.status, res.statusText)
      return { ok: false, reason: 'api_error' }
    }

    let json: unknown
    try {
      json = await res.json()
    } catch {
      return { ok: false, reason: 'unparseable' }
    }

    const parsed = json as Record<string, unknown>
    const candidates = parsed?.candidates
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { ok: false, reason: 'unparseable' }
    }

    const firstCandidate = candidates[0] as Record<string, unknown>
    const content = firstCandidate?.content as Record<string, unknown>
    const parts = content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      return { ok: false, reason: 'unparseable' }
    }

    const text = typeof (parts[0] as Record<string, unknown>).text === 'string'
      ? (parts[0] as Record<string, unknown>).text as string
      : ''

    const needsAgent = text.includes('[상담원연결필요]')

    return { ok: true, text: text.replace('[상담원연결필요]', '').trim(), needsAgent }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    console.error('[eduland-ai] error:', err instanceof Error ? err.message : err)
    return { ok: false, reason: 'api_error' }
  } finally {
    clearTimeout(timer)
  }
}
