"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/dal"
import { prisma } from "@/lib/db"

const VerifySchema = z.object({
  businessId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
})

type VerifyResult = { ok: true } | { error: string }

export async function updateBusinessVerification(
  _prevState: VerifyResult | null,
  formData: FormData,
): Promise<VerifyResult> {
  await requireAdmin()
  const parsed = VerifySchema.safeParse({
    businessId: formData.get("businessId"),
    action: formData.get("action"),
  })
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다" }
  const { businessId, action } = parsed.data
  try {
    await prisma.businessProfile.update({
      where: { id: businessId },
      data: { verified: action === "approve" },
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "업데이트 실패" }
  }
  revalidatePath(`/admin/businesses/${businessId}`)
  return { ok: true }
}
