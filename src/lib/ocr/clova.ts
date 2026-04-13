// T-06-07 mitigation: import 'server-only' prevents this module from being
// bundled into the client. Next.js build fails if a "use client" component
// imports this file directly.
import 'server-only'

import { normalizeDigits } from '@/lib/strings'

/**
 * Result type for CLOVA OCR business registration document parsing.
 *
 * ok:true  → fullText contains all inferred text; candidateRegNumbers contains
 *            digit-only 10-char strings that match the Korean biz reg number
 *            pattern (NNN-NN-NNNNN → normalizeDigits → 10 digits).
 *
 * ok:false → reason discriminates failure mode:
 *   'timeout'     — AbortController fired at 15s
 *   'api_error'   — non-2xx response OR missing env vars OR unexpected error
 *   'unparseable' — 200 OK but response body has unrecognized structure
 */
export type ClovaOcrResult =
  | { ok: true; fullText: string; candidateRegNumbers: string[] }
  | { ok: false; reason: 'timeout' | 'api_error' | 'unparseable' }

/**
 * Send a business registration document image to Naver CLOVA OCR API and
 * extract candidate business registration numbers.
 *
 * Design decisions (D-32 / D-33):
 *   - Native fetch + AbortController — no new npm packages (constraint)
 *   - 15s timeout — DoS mitigation T-06-09; fail-open per D-33
 *   - Env check before FormData construction — skip allocation on missing secret
 *   - candidateRegNumbers: only digit-only 10-char strings stored; fullText
 *     discarded at DB write time to mitigate T-06-08 (XSS via OCR text)
 *
 * Env vars required:
 *   CLOVA_OCR_SECRET   — API secret header value (X-OCR-SECRET)
 *   CLOVA_OCR_API_URL  — full APIGW invoke URL for the general OCR domain
 *
 * @param fileBuffer - Raw file bytes (from File.arrayBuffer())
 * @param mimeType   - MIME type: 'image/jpeg' | 'image/png' | 'application/pdf'
 */
export async function runBizLicenseOcr(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ClovaOcrResult> {
  // --- Env guard: skip all work if secret is missing (T-06-07 / D-33) ---
  const secret = process.env.CLOVA_OCR_SECRET
  const apiUrl = process.env.CLOVA_OCR_API_URL

  if (!secret || secret.trim() === '' || !apiUrl || apiUrl.trim() === '') {
    return { ok: false, reason: 'api_error' }
  }

  // --- AbortController for 15s timeout (T-06-09) ---
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)

  try {
    // --- Build CLOVA v2 message object ---
    const format = mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/png'
        ? 'png'
        : 'jpg'

    const msg = {
      version: 'V2',
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      images: [
        {
          format,
          name: 'biz-license',
        },
      ],
    }

    // --- Build multipart form ---
    // Note: do NOT set Content-Type header manually — fetch sets it with
    // the correct multipart boundary when body is FormData.
    const form = new FormData()
    form.append('message', JSON.stringify(msg))
    form.append('file', new Blob([fileBuffer], { type: mimeType }), 'biz-license')

    // --- Call CLOVA API ---
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-OCR-SECRET': secret,
      },
      body: form,
      signal: ctrl.signal,
    })

    if (!res.ok) {
      return { ok: false, reason: 'api_error' }
    }

    // --- Parse response ---
    let json: unknown
    try {
      json = await res.json()
    } catch {
      return { ok: false, reason: 'unparseable' }
    }

    // Validate response shape: must have images[0].fields array
    const parsed = json as Record<string, unknown>
    const images = parsed?.images
    if (!Array.isArray(images) || images.length === 0) {
      return { ok: false, reason: 'unparseable' }
    }

    const firstImage = images[0] as Record<string, unknown>
    const fields = firstImage?.fields
    if (!Array.isArray(fields)) {
      // No fields — valid 200 response but no text found; return empty result
      return { ok: true, fullText: '', candidateRegNumbers: [] }
    }

    // --- Concat all inferText values into fullText ---
    const fullText = fields
      .map((f) => {
        const field = f as Record<string, unknown>
        return typeof field.inferText === 'string' ? field.inferText : ''
      })
      .join(' ')

    // --- Extract candidate registration numbers ---
    // Korean business reg number pattern: NNN-NN-NNNNN (10 digits with optional dashes)
    // After normalizeDigits, each match is exactly 10 digits.
    // T-06-08: Only digit-normalized candidates are returned; fullText is NOT
    // written to DB — callers should store candidateRegNumbers only.
    const matches = [...fullText.matchAll(/\d{3}-?\d{2}-?\d{5}/g)]
    const candidateRegNumbers = [...new Set(matches.map((m) => normalizeDigits(m[0])))]

    return { ok: true, fullText, candidateRegNumbers }
  } catch (err) {
    // Distinguish AbortError (timeout) from other errors
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    return { ok: false, reason: 'api_error' }
  } finally {
    clearTimeout(timer)
  }
}
