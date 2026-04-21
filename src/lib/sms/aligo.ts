// Server-only so client bundles cannot pull Aligo credentials.
import "server-only";

/**
 * Aligo (smartsms.aligo.in) SMS API wrapper.
 *
 * Endpoint: POST https://apis.aligo.in/send/
 * Body: x-www-form-urlencoded
 *   user_id   — Aligo account id
 *   key       — API key
 *   sender    — registered sender number (숫자만)
 *   receiver  — destination number (comma-separated if multiple)
 *   msg       — message body (UTF-8)
 *   testmode_yn — 'Y' to skip actual SMS dispatch (dev)
 *
 * Response JSON:
 *   { result_code: number, message: string, msg_id?: number, ... }
 *   result_code 1 = queued; anything else = error (see Aligo docs).
 *
 * Callers must not pass arbitrary user-authored text here — the only
 * current use site is the OTP notification template in
 * src/lib/otp/owner-phone.ts.
 */

interface AligoResponse {
  result_code: number;
  message?: string;
  msg_id?: number;
}

export type AligoResult =
  | { ok: true; msgId?: number }
  | { ok: false; error: string };

function getAligoEnv(): {
  userId: string;
  apiKey: string;
  sender: string;
} | null {
  const userId = process.env.ALIGO_USER_ID?.trim();
  const apiKey = process.env.ALIGO_API_KEY?.trim();
  const sender = process.env.ALIGO_SENDER?.trim();
  if (!userId || !apiKey || !sender) return null;
  return { userId, apiKey, sender };
}

export function isAligoConfigured(): boolean {
  return getAligoEnv() !== null;
}

/**
 * True when sendAligoSms() will call Aligo with testmode_yn=Y — i.e. Aligo
 * will respond success without actually dispatching SMS (and without
 * billing). Used by dev helpers to decide whether it is safe to echo the
 * OTP plaintext to the server log for local verification.
 *
 * Production (NODE_ENV=production) always returns false. ALIGO_TESTMODE=off
 * also forces false to let staging exercise real delivery.
 */
export function isAligoTestmode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.ALIGO_TESTMODE === "off") return false;
  return true;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function sendAligoSms(opts: {
  to: string;
  text: string;
}): Promise<AligoResult> {
  const env = getAligoEnv();
  if (!env) {
    return { ok: false, error: "sms_not_configured" };
  }

  const receiver = normalizePhone(opts.to);
  if (!receiver) {
    return { ok: false, error: "invalid_receiver" };
  }

  // Dev/test envs default to testmode so Aligo returns success without
  // actually sending SMS (and without billing). Production sets
  // ALIGO_TESTMODE=off (or runs with NODE_ENV=production).
  const testmode =
    process.env.ALIGO_TESTMODE === "off" ||
    process.env.NODE_ENV === "production"
      ? "N"
      : "Y";

  const body = new URLSearchParams({
    user_id: env.userId,
    key: env.apiKey,
    sender: env.sender,
    receiver,
    msg: opts.text,
    testmode_yn: testmode,
  });

  try {
    const res = await fetch("https://apis.aligo.in/send/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as AligoResponse;
    if (data.result_code !== 1) {
      return { ok: false, error: data.message || "aligo_send_failed" };
    }
    return { ok: true, msgId: data.msg_id };
  } catch (err) {
    console.error("[aligo] network error", err);
    return { ok: false, error: "aligo_network_error" };
  }
}
