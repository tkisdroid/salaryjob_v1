"use server";

import { prisma } from "@/lib/db";

// Server Action: Worker checks out from completed work
export async function checkoutAction(applicationId: string) {
  // TODO: Get actual userId from Clerk auth
  const userId = "mock-user-id";

  try {
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        post: {
          include: {
            author: {
              include: { employerProfile: true },
            },
          },
        },
      },
    });

    if (application.status !== "ACCEPTED") {
      return { success: false, error: "아직 수락되지 않은 지원이에요." };
    }

    const employerProfile = application.post.author.employerProfile;
    if (!employerProfile) {
      return { success: false, error: "업체 정보를 찾을 수 없어요." };
    }

    const now = new Date();
    const checkInAt = application.checkInAt || now;
    const actualHours =
      Math.round(
        ((now.getTime() - checkInAt.getTime()) / (1000 * 60 * 60)) * 10
      ) / 10;

    const hourlyRate = application.post.payAmountMin || 10030;
    const grossAmount = Math.round(hourlyRate * Math.max(actualHours, 1));
    const commissionRate = Number(employerProfile.commissionRate);
    const commissionAmount = Math.floor((grossAmount * commissionRate) / 100);
    const netAmount = grossAmount - commissionAmount;

    const workerProfile = await prisma.workerProfile.findFirst({
      where: { userId },
    });

    if (!workerProfile) {
      return { success: false, error: "프로필을 찾을 수 없어요." };
    }

    const [, settlement] = await prisma.$transaction([
      prisma.application.update({
        where: { id: applicationId },
        data: {
          checkOutAt: now,
          actualHours,
          status: "COMPLETED",
          completedAt: now,
        },
      }),
      prisma.settlement.create({
        data: {
          applicationId,
          employerId: employerProfile.id,
          workerId: workerProfile.id,
          grossAmount,
          commissionAmount,
          netAmount,
          commissionRate,
          status: "CHECKOUT_PENDING",
        },
      }),
    ]);

    return {
      success: true,
      data: {
        settlementId: settlement.id,
        grossAmount,
        netAmount,
        actualHours,
      },
    };
  } catch (error) {
    console.error("[Checkout Action] Error:", error);
    return {
      success: false,
      error: "체크아웃 중 문제가 발생했어요. 다시 시도해주세요.",
    };
  }
}

// Server Action: Employer approves settlement
export async function approveSettlementAction(settlementId: string) {
  try {
    const settlement = await prisma.settlement.findUniqueOrThrow({
      where: { id: settlementId },
    });

    if (settlement.status !== "CHECKOUT_PENDING") {
      return { success: false, error: "이미 처리된 정산이에요." };
    }

    await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: "APPROVED" },
    });

    // Create notification for worker
    const worker = await prisma.workerProfile.findUnique({
      where: { id: settlement.workerId },
    });

    if (worker) {
      await prisma.notification.create({
        data: {
          userId: worker.userId,
          type: "SETTLEMENT_APPROVED",
          title: "정산이 승인되었어요!",
          body: `${settlement.netAmount.toLocaleString()}원 정산이 진행됩니다.`,
          data: { settlementId },
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[Approve Settlement] Error:", error);
    return {
      success: false,
      error: "정산 승인 중 문제가 발생했어요.",
    };
  }
}
