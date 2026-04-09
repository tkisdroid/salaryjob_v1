import { prisma } from "@/lib/db";

// Settlement status type
type SettlementStatus =
  | "CHECKOUT_PENDING"
  | "APPROVED"
  | "AUTO_APPROVED"
  | "PROCESSING"
  | "SETTLED"
  | "RETRY_1"
  | "RETRY_2"
  | "RETRY_3"
  | "FAILED";

// Valid state transitions
const VALID_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  CHECKOUT_PENDING: ["APPROVED", "AUTO_APPROVED"],
  APPROVED: ["PROCESSING"],
  AUTO_APPROVED: ["PROCESSING"],
  PROCESSING: ["SETTLED", "RETRY_1"],
  RETRY_1: ["SETTLED", "RETRY_2"],
  RETRY_2: ["SETTLED", "RETRY_3"],
  RETRY_3: ["SETTLED", "FAILED"],
  SETTLED: [],
  FAILED: [],
};

// Create settlement when worker checks out
export async function createSettlement(params: {
  applicationId: string;
  employerProfileId: string;
  workerProfileId: string;
  grossAmount: number;
  commissionRate: number;
}) {
  const commissionAmount = Math.floor(
    (params.grossAmount * params.commissionRate) / 100
  );
  const netAmount = params.grossAmount - commissionAmount;

  return prisma.settlement.create({
    data: {
      applicationId: params.applicationId,
      employerId: params.employerProfileId,
      workerId: params.workerProfileId,
      grossAmount: params.grossAmount,
      commissionAmount,
      netAmount,
      commissionRate: params.commissionRate,
      status: "CHECKOUT_PENDING",
    },
  });
}

// Transition settlement status with validation
export async function transitionSettlement(
  settlementId: string,
  newStatus: SettlementStatus,
  transactionId?: string
) {
  const settlement = await prisma.settlement.findUniqueOrThrow({
    where: { id: settlementId },
  });

  const currentStatus = settlement.status as SettlementStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid settlement transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(", ")}`
    );
  }

  return prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: newStatus,
      ...(transactionId && { transactionId }),
      ...(newStatus === "SETTLED" && { settledAt: new Date() }),
    },
  });
}

// Employer approves the work completion
export async function approveSettlement(settlementId: string) {
  return transitionSettlement(settlementId, "APPROVED");
}

// Auto-approve after 2 hours of no response
export async function autoApproveExpiredSettlements() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const pending = await prisma.settlement.findMany({
    where: {
      status: "CHECKOUT_PENDING",
      createdAt: { lt: twoHoursAgo },
    },
  });

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const s of pending) {
    try {
      await transitionSettlement(s.id, "AUTO_APPROVED");
      results.push({ id: s.id, success: true });
    } catch (error) {
      results.push({ id: s.id, success: false, error: String(error) });
    }
  }
  return results;
}

// Process settlement — initiate payment via Toss
export async function processSettlement(settlementId: string) {
  const settlement = await transitionSettlement(settlementId, "PROCESSING");

  try {
    const result = await initiatePayment({
      settlementId: settlement.id,
      amount: settlement.netAmount,
    });

    if (result.success) {
      return transitionSettlement(
        settlementId,
        "SETTLED",
        result.transactionId
      );
    }

    return transitionSettlement(settlementId, "RETRY_1");
  } catch {
    return transitionSettlement(settlementId, "RETRY_1");
  }
}

// Retry failed settlement with exponential backoff awareness
export async function retrySettlement(settlementId: string) {
  const settlement = await prisma.settlement.findUniqueOrThrow({
    where: { id: settlementId },
  });

  const status = settlement.status as SettlementStatus;
  if (!status.startsWith("RETRY_")) return settlement;

  try {
    const result = await initiatePayment({
      settlementId: settlement.id,
      amount: settlement.netAmount,
    });

    if (result.success) {
      return transitionSettlement(
        settlementId,
        "SETTLED",
        result.transactionId
      );
    }

    // Move to next retry or failed
    const nextStatus = VALID_TRANSITIONS[status].find((s) => s !== "SETTLED");
    if (nextStatus) {
      return transitionSettlement(settlementId, nextStatus);
    }
    return settlement;
  } catch {
    const nextStatus = VALID_TRANSITIONS[status].find((s) => s !== "SETTLED");
    if (nextStatus) {
      return transitionSettlement(settlementId, nextStatus);
    }
    return settlement;
  }
}

// Placeholder for actual Toss payment API call
async function initiatePayment(params: {
  settlementId: string;
  amount: number;
}): Promise<{ success: boolean; transactionId?: string }> {
  // TODO: Replace with actual Toss Payments API
  // POST https://api.tosspayments.com/v1/payouts
  // Headers: Authorization: Basic {base64(TOSS_SECRET_KEY:)}
  // Body: { bankCode, accountNumber, amount, ... }

  console.log(
    `[Settlement] Initiating payment: ${params.settlementId}, amount: ${params.amount}`
  );

  // Mock: 90% success rate
  const success = Math.random() > 0.1;
  return {
    success,
    transactionId: success
      ? `toss_${Date.now()}_${params.settlementId.slice(0, 8)}`
      : undefined,
  };
}
