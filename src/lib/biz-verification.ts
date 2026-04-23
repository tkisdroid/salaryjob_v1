// T-06-07 mitigation: import 'server-only' prevents this module from being
// bundled into the client. Next.js build fails if a "use client" component
// imports this file directly.
import 'server-only'

/**
 * Result type for Korean government business status verification.
 *
 * ok:true  → Business is currently operating (not closed/suspended)
 * ok:false → Business is closed, suspended, or verification failed
 */
export type BizVerificationResult =
  | {
      ok: true;
      status: 'operating';
      businessName?: string;
      ownerName?: string;
    }
  | { ok: false; reason: 'closed' | 'suspended' | 'not_found' | 'api_error' | 'invalid_format' }

/**
 * Verify business registration number against Korean government API.
 *
 * Uses the data.go.kr business status API to check if a business is currently operating.
 * Only approves businesses that are not closed or suspended.
 *
 * Env vars required:
 *   DATA_GO_KR_API_KEY — API key for data.go.kr business status service
 *
 * @param businessRegNumber - 10-digit business registration number (digits only)
 */
export async function verifyBusinessStatus(
  businessRegNumber: string,
): Promise<BizVerificationResult> {
  // --- Input validation ---
  if (!businessRegNumber || !/^\d{10}$/.test(businessRegNumber)) {
    return { ok: false, reason: 'invalid_format' }
  }

  // --- Env guard ---
  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    return { ok: false, reason: 'api_error' }
  }

  // --- AbortController for 15s timeout ---
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)

  try {
    // --- Build API request ---
    // API: https://www.data.go.kr/data/15081808/openapi.do
    const apiUrl = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(apiKey)}`

    const requestBody = {
      b_no: [businessRegNumber]
    }

    // --- Call API ---
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      console.error('[biz-verification] API error:', res.status, res.statusText)
      return { ok: false, reason: 'api_error' }
    }

    // --- Parse response ---
    let json: unknown
    try {
      json = await res.json()
    } catch (parseErr) {
      console.error('[biz-verification] response JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr)
      return { ok: false, reason: 'api_error' }
    }

    // Validate response shape
    const parsed = json as Record<string, unknown>
    const data = parsed?.data
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, reason: 'not_found' }
    }

    const firstResult = data[0] as Record<string, unknown>
    const bSttCd = firstResult?.b_stt_cd as string // 사업 상태 코드
    const bStt = firstResult?.b_stt as string // 사업 상태
    const companyNmKor = firstResult?.company_nm_kor as string // 회사명
    const ownerName = extractOwnerNameFromBizStatus(firstResult)

    // 사업 상태 코드 의미:
    // 01: 계속사업자 (operating)
    // 02: 휴업자 (suspended)
    // 03: 폐업자 (closed)

    if (bSttCd === '01') {
      return {
        ok: true,
        status: 'operating',
        businessName: companyNmKor,
        ownerName,
      }
    } else if (bSttCd === '02') {
      return { ok: false, reason: 'suspended' }
    } else if (bSttCd === '03') {
      return { ok: false, reason: 'closed' }
    } else {
      console.error('[biz-verification] unknown status code:', bSttCd, bStt)
      return { ok: false, reason: 'api_error' }
    }

  } catch (err) {
    // Distinguish AbortError (timeout) from other errors
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[biz-verification] timeout')
      return { ok: false, reason: 'api_error' }
    }
    console.error('[biz-verification] error:', err instanceof Error ? err.message : err)
    return { ok: false, reason: 'api_error' }
  } finally {
    clearTimeout(timer)
  }
}

function extractOwnerNameFromBizStatus(result: Record<string, unknown>): string | undefined {
  const candidates = [
    result['ceo_nm'],
    result['ceoNm'],
    result['rprsntv_nm'],
    result['representativeName'],
    result['representative_name'],
    result['owner_name'],
    result['ownerName'],
    result['소유자명'],
    result['대표자명'],
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const normalized = candidate.trim()
      if (normalized.length > 1 && normalized.length <= 20) {
        return normalized
      }
    }
  }

  return undefined
}
