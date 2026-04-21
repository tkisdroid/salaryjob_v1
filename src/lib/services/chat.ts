import "server-only";

import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/format";
import { isUuid } from "@/lib/uuid";

export interface ChatRoomSummary {
  id: string;
  peerName: string;
  peerInitial: string;
  jobTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatThreadDetail {
  id: string;
  peerName: string;
  peerInitial: string;
  jobTitle: string;
  messages: Array<{
    id: string;
    body: string;
    senderId: string;
    createdAt: Date;
  }>;
}

const CHAT_THREAD_INCLUDE = {
  job: { include: { business: true } },
  worker: { include: { workerProfile: true } },
  messages: { orderBy: { createdAt: "asc" as const } },
};

function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function legacyAliasIndex(value: string) {
  const match = /^(?:chat-|c)(\d+)$/i.exec(value.trim());
  if (!match) return null;

  const index = Number.parseInt(match[1], 10) - 1;
  return Number.isSafeInteger(index) && index >= 0 ? index : null;
}

export async function ensureThreadForApplication(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { include: { business: true } }, worker: { include: { workerProfile: true } } },
  });
  if (!application) return null;

  const thread = await prisma.chatThread.upsert({
    where: {
      jobId_workerId: {
        jobId: application.jobId,
        workerId: application.workerId,
      },
    },
    create: {
      applicationId: application.id,
      jobId: application.jobId,
      workerId: application.workerId,
      businessUserId: application.job.authorId,
    },
    update: {
      applicationId: application.id,
      businessUserId: application.job.authorId,
    },
  });

  const messageCount = await prisma.chatMessage.count({
    where: { threadId: thread.id },
  });
  if (messageCount === 0) {
    const workerName = application.worker.workerProfile?.name ?? "워커";
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        senderId: application.job.authorId,
        body: `${workerName}님, ${application.job.title} 지원 건으로 대화를 시작합니다.`,
      },
    });
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });
  }

  return thread;
}

export async function ensureChatThreadsForWorker(workerId: string) {
  const applications = await prisma.application.findMany({
    where: { workerId },
    select: { id: true },
    take: 100,
  });
  await Promise.all(applications.map((application) => ensureThreadForApplication(application.id)));
}

export async function ensureChatThreadsForBusiness(businessUserId: string) {
  const applications = await prisma.application.findMany({
    where: { job: { authorId: businessUserId } },
    select: { id: true },
    take: 100,
  });
  await Promise.all(applications.map((application) => ensureThreadForApplication(application.id)));
}

export async function getWorkerChatRooms(workerId: string): Promise<ChatRoomSummary[]> {
  await ensureChatThreadsForWorker(workerId);

  const rooms = await prisma.chatThread.findMany({
    where: { workerId },
    include: {
      job: { include: { business: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: workerId }, readAt: null },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rooms.map((room) => {
    const last = room.messages[0];
    const peerName = room.job.business.name;
    return {
      id: room.id,
      peerName,
      peerInitial: initialOf(peerName),
      jobTitle: room.job.title,
      lastMessage: last?.body ?? "대화를 시작해보세요.",
      lastMessageAt: formatRelativeTime(last?.createdAt ?? room.updatedAt),
      unreadCount: room._count.messages,
    };
  });
}

export async function getBusinessChatRooms(
  businessUserId: string,
): Promise<ChatRoomSummary[]> {
  await ensureChatThreadsForBusiness(businessUserId);

  const rooms = await prisma.chatThread.findMany({
    where: { businessUserId },
    include: {
      job: true,
      worker: { include: { workerProfile: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: {
            where: { senderId: { not: businessUserId }, readAt: null },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rooms.map((room) => {
    const last = room.messages[0];
    const peerName = room.worker.workerProfile?.name ?? room.worker.email ?? "워커";
    return {
      id: room.id,
      peerName,
      peerInitial: initialOf(peerName),
      jobTitle: room.job.title,
      lastMessage: last?.body ?? "대화를 시작해보세요.",
      lastMessageAt: formatRelativeTime(last?.createdAt ?? room.updatedAt),
      unreadCount: room._count.messages,
    };
  });
}

export async function getChatThreadForUser(
  threadId: string,
  userId: string,
): Promise<ChatThreadDetail | null> {
  const thread = isUuid(threadId)
    ? await prisma.chatThread.findUnique({
        where: { id: threadId },
        include: CHAT_THREAD_INCLUDE,
      })
    : await (async () => {
        const index = legacyAliasIndex(threadId);
        if (index === null) return null;

        const threads = await prisma.chatThread.findMany({
          where: {
            OR: [{ workerId: userId }, { businessUserId: userId }],
          },
          include: CHAT_THREAD_INCLUDE,
          orderBy: { updatedAt: "desc" },
          skip: index,
          take: 1,
        });

        return threads[0] ?? null;
      })();

  if (!thread) return null;
  if (thread.workerId !== userId && thread.businessUserId !== userId) return null;

  await prisma.chatMessage.updateMany({
    where: { threadId: thread.id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const peerName =
    userId === thread.workerId
      ? thread.job.business.name
      : thread.worker.workerProfile?.name ?? thread.worker.email ?? "워커";

  return {
    id: thread.id,
    peerName,
    peerInitial: initialOf(peerName),
    jobTitle: thread.job.title,
    messages: thread.messages.map((message) => ({
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      createdAt: message.createdAt,
    })),
  };
}

export async function sendChatMessage(threadId: string, userId: string, body: string) {
  if (!isUuid(threadId)) {
    return { success: false as const, error: "채팅방을 찾을 수 없습니다." };
  }

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { success: false as const, error: "메시지를 입력해 주세요." };
  }
  if (trimmed.length > 1000) {
    return { success: false as const, error: "메시지는 1000자 이하로 입력해 주세요." };
  }

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, workerId: true, businessUserId: true },
  });
  if (!thread || (thread.workerId !== userId && thread.businessUserId !== userId)) {
    return { success: false as const, error: "채팅방을 찾을 수 없습니다." };
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      senderId: userId,
      body: trimmed,
      readAt: null,
    },
  });
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: message.createdAt },
  });
  return { success: true as const };
}
