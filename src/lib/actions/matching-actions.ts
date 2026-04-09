"use server";

import { prisma } from "@/lib/db";

// Server Action: Accept an urgent match
export async function acceptUrgentMatchAction(
  postId: string,
  message?: string
) {
  // TODO: Get actual userId from Clerk auth
  const userId = "mock-user-id";

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Lock the post row to prevent concurrent accepts
      const posts = await tx.$queryRaw<
        Array<{
          id: string;
          headcount: number | null;
          applications_count: number;
          status: string;
          auto_close_date: Date | null;
          author_id: string;
          title: string;
        }>
      >`
        SELECT id, headcount, applications_count, status, auto_close_date, author_id, title
        FROM posts
        WHERE id = ${postId}::uuid
        FOR UPDATE SKIP LOCKED
      `;

      if (posts.length === 0) {
        throw new Error(
          "이 공고는 이미 다른 사람이 수락 중이에요. 잠시 후 다시 시도해주세요."
        );
      }

      const post = posts[0];

      if (post.status !== "ACTIVE") {
        throw new Error("이 공고는 이미 마감되었어요.");
      }

      if (
        post.auto_close_date &&
        new Date(post.auto_close_date) < new Date()
      ) {
        throw new Error("매칭 시간이 만료되었어요.");
      }

      const maxHeadcount = post.headcount || 1;
      const acceptedCount = await tx.application.count({
        where: { postId, status: "ACCEPTED" },
      });

      if (acceptedCount >= maxHeadcount) {
        throw new Error("이미 모집이 완료되었어요.");
      }

      const existing = await tx.application.findFirst({
        where: { postId, applicantId: userId },
      });

      if (existing) {
        throw new Error("이미 지원한 공고에요.");
      }

      const application = await tx.application.create({
        data: {
          postId,
          applicantId: userId,
          direction: "APPLY",
          status: "ACCEPTED",
          message: message || "즉시 매칭으로 수락했어요!",
          appliedAt: new Date(),
          respondedAt: new Date(),
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: {
          applicationsCount: { increment: 1 },
          ...(acceptedCount + 1 >= maxHeadcount && { status: "FILLED" }),
        },
      });

      const chatRoom = await tx.chatRoom.create({
        data: {
          applicationId: application.id,
          workerId: userId,
          employerId: post.author_id,
        },
      });

      await tx.chatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: userId,
          content: "안녕하세요! 즉시 매칭으로 수락했습니다. 출발 준비하겠습니다!",
        },
      });

      return { application, chatRoom, postTitle: post.title };
    });

    return {
      success: true,
      data: {
        applicationId: result.application.id,
        chatRoomId: result.chatRoom.id,
        postTitle: result.postTitle,
      },
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "매칭 수락 중 문제가 발생했어요.";
    return { success: false, error: msg };
  }
}

// Server Action: Create urgent post (employer)
export async function createUrgentPostAction(
  postId: string,
  radiusKm = 2,
  timeoutMinutes = 10
) {
  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        isUrgent: true,
        status: "ACTIVE",
        autoCloseType: "MANUAL",
        autoCloseDate: new Date(
          Date.now() + timeoutMinutes * 60 * 1000
        ),
      },
    });

    // Find available workers
    const availableWorkers = await prisma.workerAvailability.findMany({
      where: {
        status: "AVAILABLE",
        startAt: { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) },
        endAt: { gt: new Date() },
      },
      include: {
        worker: { include: { user: true } },
      },
      take: 50,
    });

    // Create notifications
    for (const av of availableWorkers) {
      await prisma.notification.create({
        data: {
          userId: av.worker.userId,
          type: "URGENT_MATCH",
          title: "급구! 지금 근처에서 일할 수 있어요",
          body: `${post.title} — 지금 수락하면 바로 시작!`,
          data: {
            postId: post.id,
            expiresAt: post.autoCloseDate?.toISOString() ?? "",
          },
        },
      });
    }

    return {
      success: true,
      data: {
        notifiedWorkers: availableWorkers.length,
        expiresAt: post.autoCloseDate,
      },
    };
  } catch (error) {
    console.error("[Urgent Post] Error:", error);
    return {
      success: false,
      error: "급구 매칭 시작 중 문제가 발생했어요.",
    };
  }
}
