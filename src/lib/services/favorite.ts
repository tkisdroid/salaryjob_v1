import { prisma } from "@/lib/db";

// Toggle favorite status
export async function toggleFavorite(params: {
  employerProfileId: string;
  workerProfileId: string;
}): Promise<{ isFavorite: boolean }> {
  const existing = await prisma.favoriteWorker.findUnique({
    where: {
      employerId_workerId: {
        employerId: params.employerProfileId,
        workerId: params.workerProfileId,
      },
    },
  });

  if (existing) {
    await prisma.favoriteWorker.delete({
      where: { id: existing.id },
    });
    return { isFavorite: false };
  }

  await prisma.favoriteWorker.create({
    data: {
      employerId: params.employerProfileId,
      workerId: params.workerProfileId,
    },
  });
  return { isFavorite: true };
}

// Get employer's favorites
export async function getFavorites(employerProfileId: string) {
  return prisma.favoriteWorker.findMany({
    where: { employerId: employerProfileId },
    include: {
      worker: {
        include: { user: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Notify employer when a favorite worker registers availability
export async function notifyFavoriteEmployers(workerProfileId: string) {
  const favorites = await prisma.favoriteWorker.findMany({
    where: { workerId: workerProfileId },
    include: {
      employer: { include: { user: true } },
      worker: true,
    },
  });

  const notifications = [];
  for (const fav of favorites) {
    const notification = await prisma.notification.create({
      data: {
        userId: fav.employer.userId,
        type: "FAVORITE_AVAILABLE",
        title: "단골이 시간을 등록했어요",
        body: `${fav.worker.name}님이 새로운 가용시간을 등록했어요`,
        data: { workerProfileId, workerId: fav.worker.userId },
      },
    });
    notifications.push(notification);
  }

  return notifications;
}

// Notify favorite workers when employer creates a new post
export async function notifyFavoriteWorkers(
  employerProfileId: string,
  postId: string,
  postTitle: string
) {
  const favorites = await prisma.favoriteWorker.findMany({
    where: { employerId: employerProfileId },
    include: {
      worker: { include: { user: true } },
      employer: true,
    },
  });

  const notifications = [];
  for (const fav of favorites) {
    const notification = await prisma.notification.create({
      data: {
        userId: fav.worker.userId,
        type: "FAVORITE_POST",
        title: "단골 업체에서 새 공고를 올렸어요",
        body: `${fav.employer.businessName}: ${postTitle}`,
        data: { postId, employerProfileId },
      },
    });
    notifications.push(notification);
  }

  return notifications;
}
