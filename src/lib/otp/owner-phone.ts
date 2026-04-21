// Server-only so randomInt() and the code hash stay out of the client bundle.
import "server-only";

import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  sendSms,
  isSmsConfigured,
  isSmsTestmode,
} from "@/lib/sms/ncp-sens";

/**
 * SMS OTP service for 대표자 연락처 verification.
 *
 * Flow:
 *   1. requestOwnerPhoneOtp(businessProfileId, phone)
 *      - validates KR mobile format
 *      - enforces rate limits (per-profile minute window + daily cap)
 *      - generates a 6-digit code, stores sha256(code) hex, sends SMS via Aligo
 *   2. verifyOwnerPhoneOtp(businessProfileId, phone, code)
 *      - looks up the newest non-expired, non-verified OTP for the pair
 *      - increments attempts on wrong code; locks after MAX_ATTEMPTS
 *      - on success: writes verifiedAt + business_profiles.ownerPhoneVerifiedAt
 *        in a single transaction and normalizes the stored phone
 *
 * The OTP plaintext is never persisted or logged.
 */

const OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes
const MAX_ATTEMPTS = 5;
const REQUEST_RATE_LIMIT_MS = 60 * 1000; // 1 send per minute per profile
const DAILY_REQUEST_LIMIT = 5;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const PHONE_RE = /^01[0-9]{8,9}$/;

export type OtpError =
  | "sms_not_configured"
  | "invalid_phone_format"
  | "rate_limited"
  | "daily_limit_exceeded"
  | "sms_send_failed"
  | "no_active_otp"
  | "too_many_attempts"
  | "invalid_code"
  | "expired";

export type OtpResult =
  | { ok: true }
  | { ok: false; error: OtpError; detail?: string };

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function isKoreanMobile(phone: string): boolean {
  return PHONE_RE.test(phone);
}

function otpMessage(code: string): string {
  return `[샐러리잡] 대표자 연락처 인증번호: ${code}\n3분 이내에 입력해 주세요.`;
}

export async function requestOwnerPhoneOtp(
  businessProfileId: string,
  rawPhone: string,
): Promise<OtpResult> {
  if (!isSmsConfigured()) {
    return { ok: false, error: "sms_not_configured" };
  }

  const phone = normalizePhone(rawPhone);
  if (!isKoreanMobile(phone)) {
    return { ok: false, error: "invalid_phone_format" };
  }

  const lastOtp = await prisma.ownerPhoneOtp.findFirst({
    where: { businessProfileId },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  if (
    lastOtp &&
    Date.now() - lastOtp.sentAt.getTime() < REQUEST_RATE_LIMIT_MS
  ) {
    return { ok: false, error: "rate_limited" };
  }

  const since = new Date(Date.now() - DAILY_WINDOW_MS);
  const count24h = await prisma.ownerPhoneOtp.count({
    where: { businessProfileId, sentAt: { gte: since } },
  });
  if (count24h >= DAILY_REQUEST_LIMIT) {
    return { ok: false, error: "daily_limit_exceeded" };
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const sms = await sendSms({ to: phone, text: otpMessage(code) });
  if (!sms.ok) {
    return { ok: false, error: "sms_send_failed", detail: sms.error };
  }

  await prisma.ownerPhoneOtp.create({
    data: {
      businessProfileId,
      phone,
      codeHash,
      expiresAt,
    },
  });

  // DEV ONLY: testmode means no real SMS was dispatched, so the developer
  // has no other way to see the code. isSmsTestmode() is hard-wired false
  // when NODE_ENV=production, so this cannot fire in a deployed build.
  // Set NCP_SENS_TESTMODE=off to silence the log in local runs that are
  // hitting the real NCP endpoint.
  if (isSmsTestmode()) {
    console.info(
      `[owner-phone-otp][testmode] profile=${businessProfileId} phone=${phone} code=${code}`,
    );
  }

  return { ok: true };
}

export async function verifyOwnerPhoneOtp(
  businessProfileId: string,
  rawPhone: string,
  code: string,
): Promise<OtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!isKoreanMobile(phone)) {
    return { ok: false, error: "invalid_phone_format" };
  }
  const codeHash = hashCode(code);

  const otp = await prisma.ownerPhoneOtp.findFirst({
    where: {
      businessProfileId,
      phone,
      verifiedAt: null,
    },
    orderBy: { sentAt: "desc" },
  });

  if (!otp) {
    return { ok: false, error: "no_active_otp" };
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "too_many_attempts" };
  }

  if (otp.codeHash !== codeHash) {
    await prisma.ownerPhoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "invalid_code" };
  }

  await prisma.$transaction([
    prisma.ownerPhoneOtp.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    }),
    prisma.businessProfile.update({
      where: { id: businessProfileId },
      data: {
        ownerPhone: phone,
        ownerPhoneVerifiedAt: new Date(),
      },
    }),
  ]);

  return { ok: true };
}
