"use server";

import { prisma } from "@/lib/db";

// Server Action: Register availability slots
export async function registerAvailabilityAction(
  slots: Array<{
    startAt: string; // ISO datetime
    endAt: string;
    preferredCategory?: string;
    minHourlyRate?: number;
  }>
) {
  const userId = "mock-user-id";

  try {
    const workerProfile = await prisma.workerProfile.findFirst({
      where: { userId },
    });

    if (!workerProfile) {
      return { success: false, error: "프로필을 먼저 만들어주세요." };
    }

    // Validate slots
    for (const slot of slots) {
      const start = new Date(slot.startAt);
      const end = new Date(slot.endAt);
      const durationHours =
        (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (durationHours <= 0) {
        return { success: false, error: "종료 시간은 시작 시간 이후여야 해요." };
      }
      if (durationHours > 12) {
        return {
          success: false,
          error: "하나의 슬롯은 최대 12시간까지 등록할 수 있어요.",
        };
      }
    }

    // Delete existing availability for the same time ranges, then create new ones
    const created = await prisma.$transaction(async (tx: any) => {
      const results = [];
      for (const slot of slots) {
        // Check overlap
        const overlapping = await tx.workerAvailability.findFirst({
          where: {
            workerId: workerProfile.id,
            status: "AVAILABLE",
            startAt: { lt: new Date(slot.endAt) },
            endAt: { gt: new Date(slot.startAt) },
          },
        });

        if (overlapping) {
          // Remove overlapping slot
          await tx.workerAvailability.update({
            where: { id: overlapping.id },
            data: { status: "CANCELLED" },
          });
        }

        const availability = await tx.workerAvailability.create({
          data: {
            workerId: workerProfile.id,
            startAt: new Date(slot.startAt),
            endAt: new Date(slot.endAt),
            status: "AVAILABLE",
            preferredCategory: slot.preferredCategory,
            minHourlyRate: slot.minHourlyRate,
          },
        });
        results.push(availability);
      }
      return results;
    });

    // TODO: Notify favorite employers when availability is registered
    // await notifyFavoriteEmployers(workerProfile.id);

    return {
      success: true,
      data: { slotsCreated: created.length },
    };
  } catch (error) {
    console.error("[Register Availability] Error:", error);
    return {
      success: false,
      error: "가용시간 등록 중 문제가 발생했어요.",
    };
  }
}

// Server Action: Remove availability slot
export async function removeAvailabilityAction(slotId: string) {
  try {
    await prisma.workerAvailability.update({
      where: { id: slotId },
      data: { status: "CANCELLED" },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "삭제 중 문제가 발생했어요." };
  }
}
