// T-06-07 mitigation: import 'server-only' prevents this module from being
// bundled into the client. Next.js build fails if a "use client" component
// imports this file directly.
import 'server-only'

import { normalizeDigits } from '@/lib/strings'

/**
 * Result type for Google Gemini OCR business registration document parsing.
 *
 * ok:true  → fullText contains all inferred text; candidateRegNumbers contains
 *            digit-only 10-char strings that match the Korean biz reg number
 *            pattern (NNN-NN-NNNNN → normalizeDigits → 10 digits).
 *
 * ok:false → reason discriminates failure mode:
 *   'timeout'     — AbortController fired at 30s
 *   'api_error'   — non-2xx response or unexpected error
 *   'missing_api_key' — GOOGLE_GEMINI_API_KEY not set
 *   'unparseable' — 200 OK but response body has unrecognized structure
 */
export type GeminiOcrResult =
  | { ok: true; fullText: string; candidateRegNumbers: string[] }
  | { ok: false; reason: 'timeout' | 'api_error' | 'missing_api_key' | 'unparseable' }

/**
 * Send a business registration document image to Google Gemini Flash API and
 * extract candidate business registration numbers.
 *
 * Design decisions (D-32 / D-33):
 *   - Native fetch + AbortController — no new npm packages (constraint)
 *   - 30s timeout — DoS mitigation T-06-09; fail-open per D-33
 *   - Env check before request construction — skip allocation on missing key
 *   - candidateRegNumbers: only digit-only 10-char strings stored; fullText
 *     discarded at DB write time to mitigate T-06-08 (XSS via OCR text)
 *
 * Env vars required:
 *   GOOGLE_GEMINI_API_KEY — Google AI API key for Gemini Flash
 *
 * @param fileBuffer - Raw file bytes (from File.arrayBuffer())
 * @param mimeType   - MIME type: 'image/jpeg' | 'image/png' | 'application/pdf'
 */
export async function runBizLicenseOcr(
  fileBuffer: ArrayBuffer,
  mimeType: string,
): Promise<GeminiOcrResult> {
  if (!hasGeminiApiKey()) {
    return { ok: false, reason: 'missing_api_key' }
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'api_error' }

  // --- AbortController for 30s timeout (T-06-09) ---
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30_000)

  try {
    // --- Convert image to base64 ---
    const base64Image = Buffer.from(fileBuffer).toString('base64')

    // --- Determine MIME type for Gemini ---
    const geminiMimeType = mimeType === 'image/jpeg' ? 'image/jpeg' :
                          mimeType === 'image/png' ? 'image/png' :
                          'application/pdf'

    // --- Build Gemini API request ---
    // gemini-1.5-flash was retired (404). Using current GA model as of 2026-04.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Extract all text from this Korean business registration document. Focus on finding the business registration number (사업자등록번호) which is typically a 10-digit number in format XXX-XX-XXXXX or XXXXXXXXXX. Return the extracted text and clearly identify any business registration numbers found.`
          },
          {
            inline_data: {
              mime_type: geminiMimeType,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    }

    // --- Call Gemini API ---
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    })

    if (!res.ok) {
      console.error('[gemini-ocr] API error:', res.status, res.statusText)
      return { ok: false, reason: 'api_error' }
    }

    // --- Parse response ---
    let json: unknown
    try {
      json = await res.json()
    } catch (parseErr) {
      console.error('[gemini-ocr] response JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr)
      return { ok: false, reason: 'unparseable' }
    }

    // Validate Gemini response shape
    const parsed = json as Record<string, unknown>
    const candidates = parsed?.candidates
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { ok: false, reason: 'unparseable' }
    }

    const firstCandidate = candidates[0] as Record<string, unknown>
    const content = firstCandidate?.content as Record<string, unknown>
    const parts = content?.parts
    if (!Array.isArray(parts) || parts.length === 0) {
      return { ok: true, fullText: '', candidateRegNumbers: [] }
    }

    const firstPart = parts[0] as Record<string, unknown>
    const fullText = typeof firstPart.text === 'string' ? firstPart.text : ''

    // --- Extract candidate registration numbers ---
    // Korean business reg number pattern: NNN-NN-NNNNN (10 digits with optional dashes)
    // After normalizeDigits, each match is exactly 10 digits.
    const matches = [...fullText.matchAll(/\d{3}-?\d{2}-?\d{5}/g)]
    const candidateRegNumbers = [...new Set(matches.map((m) => normalizeDigits(m[0])))]

    return { ok: true, fullText, candidateRegNumbers }
  } catch (err) {
    // Distinguish AbortError (timeout) from other errors
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    console.error('[gemini-ocr] error:', err instanceof Error ? err.message : err)
    return { ok: false, reason: 'api_error' }
  } finally {
    clearTimeout(timer)
  }
}

export function hasGeminiApiKey(): boolean {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  return Boolean(apiKey && apiKey.trim())
}
