"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusiness } from "@/lib/dal";
import { safeRevalidate } from "@/lib/safe-revalidate";

const uuidSchema = z.string().uuid("올바르지 않은 워커 ID입니다.");

export type FavoriteWorkerResult =
  | { success: true; isFavorite: boolean }
  | { success: false; error: string };

export type WorkerOfferResult =
  | { success: true; message: string }
  | { success: false; error: string };

async function ensureWorker(workerId: string) {
  const worker = await prisma.workerProfile.findUnique({
    where: { userId: workerId },
    select: { userId: true, name: true },
  });
  return worker;
}

export async function toggleFavoriteWorker(
  workerIdInput: string,
): Promise<FavoriteWorkerResult> {
  const parsed = uuidSchema.safeParse(workerIdInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." };
  }

  const session = await requireBusiness();
  const worker = await ensureWorker(parsed.data);
  if (!worker) {
    return { success: false, error: "워커 프로필을 찾을 수 없습니다." };
  }

  try {
    const existing = await prisma.favoriteWorker.findUnique({
      where: {
        businessUserId_workerId: {
          businessUserId: session.id,
          workerId: parsed.data,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.favoriteWorker.delete({ where: { id: existing.id } });
      safeRevalidate("/biz/workers");
      safeRevalidate(`/biz/workers/${parsed.data}`);
      return { success: true, isFavorite: false };
    }

    await prisma.favoriteWorker.create({
      data: {
        businessUserId: session.id,
        workerId: parsed.data,
      },
    });
    safeRevalidate("/biz/workers");
    safeRevalidate(`/biz/workers/${parsed.data}`);
    return { success: true, isFavorite: true };
  } catch (e) {
    console.error("[toggleFavoriteWorker]", e);
    return { success: false, error: "단골 저장 중 오류가 발생했습니다." };
  }
}

export async function sendWorkerOffer(
  workerIdInput: string,
): Promise<WorkerOfferResult> {
  const parsed = uuidSchema.safeParse(workerIdInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." };
  }

  const session = await requireBusiness();
  const [worker, business] = await Promise.all([
    ensureWorker(parsed.data),
    prisma.businessProfile.findFirst({
      where: { userId: session.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!worker) {
    return { success: false, error: "워커 프로필을 찾을 수 없습니다." };
  }
  if (!business) {
    return { success: false, error: "사업장 프로필을 먼저 등록해 주세요." };
  }

  try {
    await prisma.workerOffer.create({
      data: {
        businessId: business.id,
        workerId: parsed.data,
        message: `${business.name}에서 ${worker.name}님에게 근무 제안을 보냈습니다.`,
      },
    });
    safeRevalidate("/biz/workers");
    safeRevalidate(`/biz/workers/${parsed.data}`);
    return { success: true, message: "제안을 보냈습니다." };
  } catch (e) {
    console.error("[sendWorkerOffer]", e);
    return { success: false, error: "제안 전송 중 오류가 발생했습니다." };
  }
}
