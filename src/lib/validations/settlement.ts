import { z } from "zod";

export const checkoutSchema = z.object({
  applicationId: z.string().uuid("올바른 지원 ID가 필요합니다"),
});

export const approveSettlementSchema = z.object({
  settlementId: z.string().uuid("올바른 정산 ID가 필요합니다"),
});

export const settlementQuerySchema = z.object({
  status: z
    .enum([
      "CHECKOUT_PENDING",
      "APPROVED",
      "AUTO_APPROVED",
      "PROCESSING",
      "SETTLED",
      "RETRY_1",
      "RETRY_2",
      "RETRY_3",
      "FAILED",
    ])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
