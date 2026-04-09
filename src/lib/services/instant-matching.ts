import { prisma } from "@/lib/db";

// Create an urgent post and find nearby available workers
export async function createUrgentPost(params: {
  postId: string;
  employerId: string;
  radiusKm: number; // default 2
  timeoutMinutes: number; // default 10
}) {
  // Mark post as urgent
  const post = await prisma.post.update({
    where: { id: params.postId },
    data: {
      isUrgent: true,
      status: "ACTIVE",
      autoCloseType: "DATE",
      autoCloseDate: new Date(Date.now() + params.timeoutMinutes * 60 * 1000),
    },
  });

  // Find available workers within radius
  // For now, query workers who have availability slots that overlap with post time
  // TODO: Use PostGIS ST_DWithin for actual geo queries once geography columns are added
  const availableWorkers = await prisma.workerAvailability.findMany({
    where: {
      status: "AVAILABLE",
      startAt: { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }, // within 2 hours
      endAt: { gt: new Date() },
    },
    include: {
      worker: {
        include: { user: true },
      },
    },
    take: 50, // cap at 50 notifications
  });

  // Create notifications for each available worker
  const notifications = [];
  for (const availability of availableWorkers) {
    const notification = await prisma.notification.create({
      data: {
        userId: availability.worker.userId,
        type: "URGENT_MATCH",
        title: "\uAE09\uAD6C! \uC9C0\uAE08 \uADFC\uCC98\uC5D0\uC11C \uC77C\uD560 \uC218 \uC788\uC5B4\uC694",
        body: `${post.title} \u2014 \uC9C0\uAE08 \uC218\uB77D\uD558\uBA74 \uBC14\uB85C \uC2DC\uC791\uD560 \uC218 \uC788\uC5B4\uC694!`,
        data: {
          postId: post.id,
          urgentMatchId: `urgent_${post.id}_${Date.now()}`,
          expiresAt: post.autoCloseDate?.toISOString(),
        },
      },
    });
    notifications.push(notification);
  }

  return {
    post,
    notifiedWorkers: availableWorkers.length,
    notifications,
    expiresAt: post.autoCloseDate,
  };
}

// Worker accepts an urgent match — uses SELECT FOR UPDATE to prevent race conditions
export async function acceptUrgentMatch(params: {
  postId: string;
  workerId: string;
  message?: string;
}) {
  // Use a raw transaction with SELECT FOR UPDATE to prevent concurrent accepts
  return prisma.$transaction(async (tx: any) => {
    // Lock the post row to prevent concurrent modifications
    const posts = await tx.$queryRaw<
      Array<{
        id: string;
        headcount: number | null;
        applications_count: number;
        status: string;
        auto_close_date: Date | null;
      }>
    >`
      SELECT id, headcount, applications_count, status, auto_close_date
      FROM posts
      WHERE id = ${params.postId}::uuid
      FOR UPDATE SKIP LOCKED
    `;

    if (posts.length === 0) {
      throw new Error(
        "\uC774 \uACF5\uACE0\uB294 \uC774\uBBF8 \uB2E4\uB978 \uC0AC\uB78C\uC774 \uC218\uB77D \uC911\uC774\uC5D0\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694."
      );
    }

    const post = posts[0];

    // Check if post is still active and not expired
    if (post.status !== "ACTIVE") {
      throw new Error("\uC774 \uACF5\uACE0\uB294 \uC774\uBBF8 \uB9C8\uAC10\uB418\uC5C8\uC5B4\uC694.");
    }

    if (post.auto_close_date && new Date(post.auto_close_date) < new Date()) {
      throw new Error("\uB9E4\uCE6D \uC2DC\uAC04\uC774 \uB9CC\uB8CC\uB418\uC5C8\uC5B4\uC694.");
    }

    // Check headcount
    const maxHeadcount = post.headcount || 1;
    const acceptedCount = await tx.application.count({
      where: {
        postId: params.postId,
        status: "ACCEPTED",
      },
    });

    if (acceptedCount >= maxHeadcount) {
      throw new Error("\uC774\uBBF8 \uBAA8\uC9D1\uC774 \uC644\uB8CC\uB418\uC5C8\uC5B4\uC694.");
    }

    // Check for duplicate application
    const existing = await tx.application.findFirst({
      where: {
        postId: params.postId,
        applicantId: params.workerId,
      },
    });

    if (existing) {
      throw new Error("\uC774\uBBF8 \uC9C0\uC6D0\uD55C \uACF5\uACE0\uC5D0\uC694.");
    }

    // Create application in ACCEPTED state (instant match = auto-accept)
    const application = await tx.application.create({
      data: {
        postId: params.postId,
        applicantId: params.workerId,
        direction: "APPLY",
        status: "ACCEPTED",
        message: params.message || "\uC989\uC2DC \uB9E4\uCE6D\uC73C\uB85C \uC218\uB77D\uD588\uC5B4\uC694!",
        appliedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    // Update post application count
    await tx.post.update({
      where: { id: params.postId },
      data: {
        applicationsCount: { increment: 1 },
        // If headcount reached, mark as filled
        ...(acceptedCount + 1 >= maxHeadcount && { status: "FILLED" }),
      },
    });

    // Create chat room for the match
    const postData = await tx.post.findUnique({
      where: { id: params.postId },
    });

    const chatRoom = await tx.chatRoom.create({
      data: {
        applicationId: application.id,
        workerId: params.workerId,
        employerId: postData!.authorId,
      },
    });

    // Send welcome message
    await tx.chatMessage.create({
      data: {
        roomId: chatRoom.id,
        senderId: params.workerId,
        content:
          "\uC548\uB155\uD558\uC138\uC694! \uC989\uC2DC \uB9E4\uCE6D\uC73C\uB85C \uC218\uB77D\uD588\uC2B5\uB2C8\uB2E4. \uCD9C\uBC1C \uC900\uBE44\uD558\uACA0\uC2B5\uB2C8\uB2E4!",
      },
    });

    return { application, chatRoom };
  });
}

// Expire urgent posts that have passed their timeout
export async function expireUrgentPosts() {
  const expired = await prisma.post.updateMany({
    where: {
      isUrgent: true,
      status: "ACTIVE",
      autoCloseDate: { lt: new Date() },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return { expiredCount: expired.count };
}
