"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/dal";
import { prisma } from "@/lib/db";
import type { ProfileFormState } from "@/lib/form-state";
import {
  RegNumberSchema,
  OwnerPhoneSchema,
  normalizeRegNumber,
} from "@/lib/validations/business";
import {
  requestOwnerPhoneOtp,
  verifyOwnerPhoneOtp,
  normalizePhone as normalizeOtpPhone,
  type OtpError,
} from "@/lib/otp/owner-phone";

const JOB_CATEGORIES = [
  "food",
  "retail",
  "logistics",
  "office",
  "event",
  "cleaning",
  "education",
  "tech",
] as const;

type JobCategoryLiteral = (typeof JOB_CATEGORIES)[number];

const BizProfileSchema = z.object({
  profileId: z.string().uuid("사업장 ID가 올바르지 않습니다"),
  name: z
    .string()
    .min(1, "상호명은 필수입니다")
    .max(100, "상호명은 100자 이하여야 합니다"),
  category: z.enum(JOB_CATEGORIES, { message: "카테고리를 선택해주세요" }),
  logo: z
    .string()
    .max(10, "로고 이모지는 10자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .min(1, "주소는 필수입니다")
    .max(200, "주소는 200자 이하여야 합니다"),
  addressDetail: z
    .string()
    .max(100, "상세주소는 100자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  lat: z.coerce
    .number()
    .min(-90, "위도는 -90 이상이어야 합니다")
    .max(90, "위도는 90 이하여야 합니다"),
  lng: z.coerce
    .number()
    .min(-180, "경도는 -180 이상이어야 합니다")
    .max(180, "경도는 180 이하여야 합니다"),
  description: z
    .string()
    .max(500, "설명은 500자 이하여야 합니다")
    .optional()
    .or(z.literal("")),
  // D-30 / D-37: optional business registration fields
  businessRegNumber: RegNumberSchema.optional().or(z.literal("")),
  ownerName: z.string().max(100, "대표자명은 100자 이하여야 합니다").optional().or(z.literal("")),
  ownerPhone: OwnerPhoneSchema.optional().or(z.literal("")),
});

/**
 * updateBusinessProfile — Business profile CRUD Server Action.
 *
 * BIZ-01: persists name, address, category, logo emoji, description, lat/lng.
 * BIZ-02: read-only fields (rating, reviewCount, completionRate, verified)
 *         are NOT read from FormData (Zod whitelist drops unknown keys).
 * BIZ-03: owner check — the profileId from FormData must belong to the
 *         authenticated session.id, or the action refuses.
 *
 * Supports 1:many: user can edit any BusinessProfile they own, addressed by profileId.
 */
export async function updateBusinessProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireBusiness();

  // Explicit whitelist — any FormData field not listed here is ignored.
  const raw = {
    profileId: (formData.get("profileId") ?? "") as string,
    name: (formData.get("name") ?? "") as string,
    category: (formData.get("category") ?? "") as string,
    logo: (formData.get("logo") ?? "") as string,
    address: (formData.get("address") ?? "") as string,
    addressDetail: (formData.get("addressDetail") ?? "") as string,
    lat: (formData.get("lat") ?? "") as string,
    lng: (formData.get("lng") ?? "") as string,
    description: (formData.get("description") ?? "") as string,
    businessRegNumber: (formData.get("businessRegNumber") ?? "") as string,
    ownerName: (formData.get("ownerName") ?? "") as string,
    ownerPhone: (formData.get("ownerPhone") ?? "") as string,
  };

  const parsed = BizProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    const firstError =
      Object.values(fieldErrors)[0] ?? "입력값이 올바르지 않습니다";
    return { error: firstError, fieldErrors };
  }

  const d = parsed.data;

  // BIZ-03 owner check — Prisma bypasses Supabase RLS, so this application-layer
  // check is the primary defense. DO NOT remove.
  const existing = await prisma.businessProfile.findUnique({
    where: { id: d.profileId },
    select: { id: true, userId: true, ownerPhone: true, ownerPhoneVerifiedAt: true },
  });
  if (!existing) {
    return { error: "사업장을 찾을 수 없습니다" };
  }
  if (existing.userId !== session.id) {
    console.warn(
      `BIZ-03 owner check failed: user ${session.id} tried to update profile ${d.profileId} owned by ${existing.userId}`,
    );
    return { error: "이 사업장을 수정할 권한이 없습니다" };
  }

  try {
    // verified is NOT auto-set here — it flips true only via OCR match in /biz/verify (D-33).
    // Clearing the regNumber still revokes verified=false to prevent stale trust.
    // If regNumber field absent from FormData → leave both unchanged (undefined = no-op).
    let verifiedUpdate: boolean | undefined = undefined
    let normalizedRegNumber: string | null | undefined = undefined

    const rawReg = d.businessRegNumber
    if (rawReg && rawReg.trim() !== '') {
      // RegNumberSchema already validated the format — safe to normalize.
      // verified is intentionally NOT set here; format-valid alone is insufficient.
      normalizedRegNumber = normalizeRegNumber(rawReg)
    } else if (rawReg === '') {
      // Explicitly cleared — revoke verified status and clear the stored number.
      normalizedRegNumber = null
      verifiedUpdate = false
    }
    // If rawReg is undefined (field not in FormData) — leave both unchanged

    // Reset the SMS-verified timestamp whenever the submitted owner phone
    // diverges from what was last verified — otherwise a user could swap
    // the number via the plain profile form and keep a stale "인증됨" badge.
    const incomingPhoneDigits = d.ownerPhone
      ? normalizeOtpPhone(d.ownerPhone)
      : "";
    const existingPhoneDigits = existing.ownerPhone
      ? normalizeOtpPhone(existing.ownerPhone)
      : "";
    const phoneChanged = incomingPhoneDigits !== existingPhoneDigits;
    const shouldClearVerifiedAt =
      phoneChanged && existing.ownerPhoneVerifiedAt !== null;

    // Step 1: Update scalar columns via Prisma.
    await prisma.businessProfile.update({
      where: { id: d.profileId },
      data: {
        name: d.name,
        category: d.category as JobCategoryLiteral,
        logo: d.logo || null,
        address: d.address,
        addressDetail: d.addressDetail || null,
        lat: d.lat,
        lng: d.lng,
        description: d.description || null,
        // D-37: optional business registration fields
        ...(normalizedRegNumber !== undefined && { businessRegNumber: normalizedRegNumber }),
        ...(d.ownerName !== undefined && { ownerName: d.ownerName || null }),
        ...(d.ownerPhone !== undefined && { ownerPhone: d.ownerPhone || null }),
        ...(shouldClearVerifiedAt && { ownerPhoneVerifiedAt: null }),
        ...(verifiedUpdate !== undefined && { verified: verifiedUpdate }),
      },
    });

    // Step 2: Update the PostGIS geography(Point) column via raw SQL.
    // Prisma cannot write Unsupported columns — same pattern as Phase 2 seed.ts.
    // Values are parameterized by Prisma tagged template (no injection);
    // lat/lng are already numeric (Zod coerce + range validation).
    await prisma.$executeRaw`
      UPDATE public.business_profiles
      SET location = ST_SetSRID(ST_MakePoint(${d.lng}, ${d.lat}), 4326)::geography
      WHERE id = ${d.profileId}::uuid
    `;

    revalidatePath("/biz/profile");
    revalidatePath("/biz");

    return {
      success: true,
      data: { id: d.profileId },
      message: "사업장 정보가 저장되었습니다",
    };
  } catch (e) {
    // Do NOT leak DB error details to the user.
    console.error("updateBusinessProfile error", e);
    return { error: "저장에 실패했습니다. 잠시 후 다시 시도해주세요" };
  }
}

// ─── 대표자 연락처 SMS OTP 인증 ──────────────────────────────────────────

function otpErrorMessage(err: OtpError): string {
  switch (err) {
    case "sms_not_configured":
      return "문자 발송이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.";
    case "invalid_phone_format":
      return "휴대폰 번호 형식이 올바르지 않습니다.";
    case "rate_limited":
      return "인증번호는 1분에 한 번만 요청할 수 있어요.";
    case "daily_limit_exceeded":
      return "오늘 요청 가능한 횟수를 초과했어요. 내일 다시 시도해 주세요.";
    case "sms_send_failed":
      return "문자 발송에 실패했습니다. 번호를 확인한 뒤 다시 시도해 주세요.";
    case "no_active_otp":
      return "유효한 인증 요청이 없습니다. 인증번호를 다시 받아 주세요.";
    case "expired":
      return "인증번호가 만료되었습니다. 다시 받아 주세요.";
    case "too_many_attempts":
      return "인증 시도 횟수를 초과했습니다. 인증번호를 다시 받아 주세요.";
    case "invalid_code":
      return "인증번호가 올바르지 않습니다.";
  }
}

async function assertOwnsProfile(profileId: string, userId: string) {
  const row = await prisma.businessProfile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true },
  });
  if (!row) return { ok: false as const, error: "사업장을 찾을 수 없습니다" };
  if (row.userId !== userId) {
    console.warn(
      `BIZ-03 owner check failed: user ${userId} tried to touch phone OTP on profile ${profileId} owned by ${row.userId}`,
    );
    return {
      ok: false as const,
      error: "이 사업장을 수정할 권한이 없습니다",
    };
  }
  return { ok: true as const };
}

const ProfileIdSchema = z.string().uuid("사업장 ID가 올바르지 않습니다");

/**
 * Send an SMS OTP to the submitted owner phone. Does NOT change the stored
 * ownerPhone — that happens only on a successful verifyPhoneOtp call.
 */
export async function requestPhoneOtp(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireBusiness();

  const profileIdRaw = (formData.get("profileId") ?? "") as string;
  const phoneRaw = (formData.get("ownerPhone") ?? "") as string;

  const profileIdResult = ProfileIdSchema.safeParse(profileIdRaw);
  if (!profileIdResult.success) {
    return { error: "사업장 ID가 올바르지 않습니다" };
  }
  const phoneResult = OwnerPhoneSchema.safeParse(phoneRaw);
  if (!phoneResult.success) {
    return {
      error: "휴대폰 번호 형식이 올바르지 않습니다.",
      fieldErrors: { ownerPhone: "휴대폰 번호 형식이 올바르지 않습니다." },
    };
  }

  const ownership = await assertOwnsProfile(profileIdResult.data, session.id);
  if (!ownership.ok) return { error: ownership.error };

  const res = await requestOwnerPhoneOtp(profileIdResult.data, phoneResult.data);
  if (!res.ok) {
    return { error: otpErrorMessage(res.error) };
  }

  return {
    success: true,
    data: { id: profileIdResult.data },
    message: "인증번호를 전송했어요. 3분 이내에 입력해 주세요.",
  };
}

/**
 * Verify the submitted code against the freshest active OTP for (profile, phone).
 * On success, the owner_phone_otps row + business_profiles.ownerPhoneVerifiedAt
 * are updated atomically in `verifyOwnerPhoneOtp`.
 */
export async function verifyPhoneOtp(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireBusiness();

  const profileIdRaw = (formData.get("profileId") ?? "") as string;
  const phoneRaw = (formData.get("ownerPhone") ?? "") as string;
  const codeRaw = (formData.get("code") ?? "") as string;

  const profileIdResult = ProfileIdSchema.safeParse(profileIdRaw);
  if (!profileIdResult.success) {
    return { error: "사업장 ID가 올바르지 않습니다" };
  }
  const phoneResult = OwnerPhoneSchema.safeParse(phoneRaw);
  if (!phoneResult.success) {
    return { error: "휴대폰 번호 형식이 올바르지 않습니다." };
  }
  if (!/^\d{6}$/.test(codeRaw)) {
    return {
      error: "인증번호 6자리를 정확히 입력해 주세요.",
      fieldErrors: { code: "인증번호 6자리를 정확히 입력해 주세요." },
    };
  }

  const ownership = await assertOwnsProfile(profileIdResult.data, session.id);
  if (!ownership.ok) return { error: ownership.error };

  const res = await verifyOwnerPhoneOtp(
    profileIdResult.data,
    phoneResult.data,
    codeRaw,
  );
  if (!res.ok) {
    return { error: otpErrorMessage(res.error) };
  }

  revalidatePath("/biz/profile");

  return {
    success: true,
    data: { id: profileIdResult.data },
    message: "대표자 연락처 인증이 완료되었습니다.",
  };
}
