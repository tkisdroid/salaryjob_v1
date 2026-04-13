"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * updateCommissionRate — Admin Server Action.
 *
 * T-06-12: requireAdmin() gates this action; non-admin gets redirect.
 * Zod validates rate within [0, 100] with 0.01 precision.
 * Empty string → null → resets to env default (D-36).
 */

const UpdateCommissionSchema = z.object({
  businessId: z.string().uuid("유효하지 않은 사업장 ID입니다"),
  rate: z.union([
    z.literal(""),
    z.coerce.number().min(0, "수수료율은 0 이상이어야 합니다").max(100, "수수료율은 100 이하여야 합니다").multipleOf(0.01, "소수점 둘째 자리까지 입력 가능합니다"),
  ]),
});

type UpdateCommissionResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function updateCommissionRate(
  formData: FormData,
): Promise<UpdateCommissionResult> {
  // T-06-12: ADMIN role required
  await requireAdmin();

  const parsed = UpdateCommissionSchema.safeParse({
    businessId: formData.get("businessId"),
    rate: formData.get("rate"),
  });

  if (!parsed.success) {
    return {
      error: "입력값이 올바르지 않습니다",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { businessId, rate } = parsed.data;
  // Empty string → null → reset to platform default (D-36)
  const rateDecimal = rate === "" ? null : new Prisma.Decimal(rate);

  try {
    await prisma.businessProfile.update({
      where: { id: businessId },
      data: { commissionRate: rateDecimal },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "데이터베이스 오류가 발생했습니다";
    return { error: message };
  }

  revalidatePath(`/admin/businesses/${businessId}`);
  return { ok: true };
}
