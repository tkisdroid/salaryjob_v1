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
    select: { id: true, userId: true },
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
    // D-30: Determine verified state based on regNumber presence and validity.
    // If regNumber is provided and format-valid → verified=true (auto-approve).
    // If regNumber is cleared (empty string) → verified=false (per Pitfall 3).
    // If regNumber field absent from FormData → leave verified unchanged (undefined = no-op).
    let verifiedUpdate: boolean | undefined = undefined
    let normalizedRegNumber: string | null | undefined = undefined

    const rawReg = d.businessRegNumber
    if (rawReg && rawReg.trim() !== '') {
      // RegNumberSchema already validated the format — safe to normalize
      normalizedRegNumber = normalizeRegNumber(rawReg)
      verifiedUpdate = true // D-30 auto-approve
    } else if (rawReg === '') {
      // Explicitly cleared — revoke verified status
      normalizedRegNumber = null
      verifiedUpdate = false
    }
    // If rawReg is undefined (field not in FormData) — leave both unchanged

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
