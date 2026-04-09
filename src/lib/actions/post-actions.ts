"use server";

import { prisma } from "@/lib/db";

// Server Action: Create a new post
export async function createPostAction(data: {
  postType: "JOB_OFFER" | "JOB_SEEK" | "FREE";
  title: string;
  content?: string;
  category?: string;
  locationType?: string;
  address?: string;
  lat?: number;
  lng?: number;
  scheduleType?: string;
  workDates?: string[];
  startTime?: string;
  endTime?: string;
  payType?: string;
  payAmountMin?: number;
  payAmountMax?: number;
  headcount?: number;
  tags?: string[];
}) {
  // TODO: Get actual userId from Clerk auth
  const userId = "mock-user-id";

  try {
    // Verify employer has business verification for JOB_OFFER posts
    if (data.postType === "JOB_OFFER") {
      const verification = await prisma.businessVerification.findFirst({
        where: { userId, verificationStatus: "VERIFIED" },
      });
      if (!verification) {
        return {
          success: false,
          error: "사업자 인증을 먼저 완료해주세요.",
        };
      }
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        postType: data.postType,
        title: data.title,
        content: data.content,
        contentPlain: data.content?.replace(/<[^>]*>/g, ""),
        locationType: (data.locationType as "ONSITE") || "ONSITE",
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        scheduleType: (data.scheduleType as "FLEXIBLE") || "FLEXIBLE",
        workDates: data.workDates || [],
        startTime: data.startTime,
        endTime: data.endTime,
        payType: (data.payType as "NEGOTIABLE") || "NEGOTIABLE",
        payAmountMin: data.payAmountMin,
        payAmountMax: data.payAmountMax,
        headcount: data.headcount,
        status: "ACTIVE",
      },
    });

    // Create tags
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, "-"),
            type: "USER",
          },
          update: {
            usageCount: { increment: 1 },
          },
        });

        await prisma.postTag.create({
          data: { postId: post.id, tagId: tag.id },
        });
      }
    }

    return { success: true, data: { postId: post.id } };
  } catch (error) {
    console.error("[Create Post] Error:", error);
    return {
      success: false,
      error: "공고 등록 중 문제가 발생했어요.",
    };
  }
}

// Server Action: Apply to a post
export async function applyToPostAction(data: {
  postId: string;
  message?: string;
  proposedPay?: string;
}) {
  const userId = "mock-user-id";

  try {
    // Check for duplicate
    const existing = await prisma.application.findFirst({
      where: {
        postId: data.postId,
        applicantId: userId,
        direction: "APPLY",
      },
    });

    if (existing) {
      return { success: false, error: "이미 지원한 공고에요." };
    }

    // Check headcount
    const post = await prisma.post.findUniqueOrThrow({
      where: { id: data.postId },
    });

    if (post.status !== "ACTIVE") {
      return { success: false, error: "마감된 공고에요." };
    }

    if (post.headcount) {
      const acceptedCount = await prisma.application.count({
        where: { postId: data.postId, status: "ACCEPTED" },
      });
      if (acceptedCount >= post.headcount) {
        return { success: false, error: "모집 인원이 마감되었어요." };
      }
    }

    const application = await prisma.application.create({
      data: {
        postId: data.postId,
        applicantId: userId,
        direction: "APPLY",
        message: data.message,
        proposedPay: data.proposedPay,
        status: "PENDING",
      },
    });

    // Increment application count
    await prisma.post.update({
      where: { id: data.postId },
      data: { applicationsCount: { increment: 1 } },
    });

    // Notify employer
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: "NEW_APPLICATION",
        title: "새 지원이 들어왔어요!",
        body: `"${post.title}"에 새 지원자가 있어요`,
        data: { postId: post.id, applicationId: application.id },
      },
    });

    return { success: true, data: { applicationId: application.id } };
  } catch (error) {
    console.error("[Apply] Error:", error);
    return {
      success: false,
      error: "지원 중 문제가 발생했어요.",
    };
  }
}

// Server Action: Accept/Reject application (employer)
export async function respondToApplicationAction(
  applicationId: string,
  action: "accept" | "reject"
) {
  try {
    const application = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { post: true },
    });

    if (application.status !== "PENDING" && application.status !== "VIEWED") {
      return { success: false, error: "이미 처리된 지원이에요." };
    }

    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
      },
    });

    // Create chat room on accept
    if (action === "accept") {
      await prisma.chatRoom.create({
        data: {
          applicationId,
          workerId: application.applicantId,
          employerId: application.post.authorId,
        },
      });
    }

    // Notify applicant
    await prisma.notification.create({
      data: {
        userId: application.applicantId,
        type:
          action === "accept"
            ? "APPLICATION_ACCEPTED"
            : "APPLICATION_REJECTED",
        title:
          action === "accept"
            ? "지원이 수락되었어요! 🎉"
            : "지원 결과를 알려드려요",
        body:
          action === "accept"
            ? `"${application.post.title}" — 채팅방이 열렸어요!`
            : `"${application.post.title}" — 아쉽지만 이번에는 매칭되지 않았어요.`,
        data: { applicationId, postId: application.postId },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[Respond Application] Error:", error);
    return {
      success: false,
      error: "처리 중 문제가 발생했어요.",
    };
  }
}
