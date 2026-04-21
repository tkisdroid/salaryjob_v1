// Server-only so NCP SENS secrets never enter the client bundle.
import "server-only";

import { createHmac } from "node:crypto";

/**
 * Naver Cloud Platform — SENS (Simple & Easy Notification Service) SMS
 * provider adapter. Docs: https://guide.ncloud-docs.com/docs/sens-overview
 *
 * Endpoint:
 *   POST https://sens.apigw.ntruss.com/sms/v2/services/{serviceId}/messages
 *
 * Auth headers:
 *   x-ncp-apigw-timestamp    — epoch ms as a decimal string
 *   x-ncp-iam-access-key     — NCP access key id
 *   x-ncp-apigw-signature-v2 — HMAC-SHA256(secret, "POST <path>\n<ts>\n<accessKey>"), base64
 *
 * Response JSON — success is `statusCode: "202"`.
 *
 * SENS has no per-request testmode flag. For local dev, set
 * NCP_SENS_TESTMODE=on (default while NODE_ENV!=="production") to skip the
 * HTTP call entirely; the OTP caller prints the plaintext code to the
 * server log for manual verification.
 *
 * Export shape is provider-neutral so swapping SMS providers later only
 * needs an import path change in src/lib/otp/owner-phone.ts.
 */

interface SensEnv {
  serviceId: string;
  accessKey: string;
  secretKey: string;
  from: string;
}

interface SensResponse {
  requestId?: string;
  statusCode?: string;
  statusName?: string;
}

export type SmsResult =
  | { ok: true; requestId?: string }
  | { ok: false; error: string };

function getEnv(): SensEnv | null {
  const serviceId = process.env.NCP_SENS_SERVICE_ID?.trim();
  const accessKey = process.env.NCP_SENS_ACCESS_KEY?.trim();
  const secretKey = process.env.NCP_SENS_SECRET_KEY?.trim();
  const from = process.env.NCP_SENS_FROM?.trim();
  if (!serviceId || !accessKey || !secretKey || !from) return null;
  return { serviceId, accessKey, secretKey, from };
}

export function isSmsConfigured(): boolean {
  return getEnv() !== null;
}

/**
 * True when the adapter will short-circuit the HTTP call (no SMS sent,
 * no billing). Production always returns false.
 */
export function isSmsTestmode(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NCP_SENS_TESTMODE === "off") return false;
  return true;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

function makeSignature(opts: {
  method: "POST";
  path: string;
  timestamp: string;
  accessKey: string;
  secretKey: string;
}): string {
  const baseString = `${opts.method} ${opts.path}\n${opts.timestamp}\n${opts.accessKey}`;
  return createHmac("sha256", opts.secretKey)
    .update(baseString)
    .digest("base64");
}

export async function sendSms(opts: {
  to: string;
  text: string;
}): Promise<SmsResult> {
  const env = getEnv();
  if (!env) return { ok: false, error: "sms_not_configured" };

  // Dev short-circuit — skip the NCP call, let the OTP caller log the
  // code to the server console.
  if (isSmsTestmode()) {
    return { ok: true, requestId: "testmode" };
  }

  const receiver = normalizePhone(opts.to);
  if (!receiver) return { ok: false, error: "invalid_receiver" };

  const path = `/sms/v2/services/${env.serviceId}/messages`;
  const url = `https://sens.apigw.ntruss.com${path}`;
  const timestamp = Date.now().toString();
  const signature = makeSignature({
    method: "POST",
    path,
    timestamp,
    accessKey: env.accessKey,
    secretKey: env.secretKey,
  });

  const body = JSON.stringify({
    type: "SMS",
    contentType: "COMM",
    countryCode: "82",
    from: env.from,
    content: opts.text,
    messages: [{ to: receiver }],
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": env.accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      // Log status + body for operators; do NOT log credentials or phone.
      console.error(
        `[ncp-sens] HTTP ${res.status}: ${errText.slice(0, 300)}`,
      );
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as SensResponse;
    if (data.statusCode !== "202") {
      console.error(
        `[ncp-sens] unexpected statusCode=${data.statusCode} statusName=${data.statusName}`,
      );
      return {
        ok: false,
        error: `ncp_status_${data.statusCode ?? "unknown"}`,
      };
    }
    return { ok: true, requestId: data.requestId };
  } catch (err) {
    console.error("[ncp-sens] network error", err);
    return { ok: false, error: "ncp_network_error" };
  }
}
