// RED BASELINE (Wave 0): until Plan 04-06 implements sendPushToUser with 410 Gone cleanup.
// REQ: NOTIF-01 — sendNotification가 410 Gone 응답을 받으면 해당 PushSubscription row를 삭제한다.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  truncatePhase4Tables,
  buildMockSubscription,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import { sendPushToUser } from "@/lib/push";
const webpush = (await import("web-push")) as unknown as {
  sendNotification: ReturnType<typeof vi.fn>;
};

describe.skipIf(skipIfNoSupabase())("NOTIF-01 sendPushToUser 410 cleanup", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
    webpush.sendNotification.mockReset();
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
    vi.restoreAllMocks();
  });

  it("deletes PushSubscription row when web-push throws 410 Gone", async () => {
    const worker = await createTestWorker();
    const sub = buildMockSubscription();

    // Seed PushSubscription via Prisma (model added in Plan 04-02)
    await (prisma as unknown as {
      pushSubscription: {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      };
    }).pushSubscription.create({
      data: {
        userId: worker.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
    });

    webpush.sendNotification.mockRejectedValueOnce(
      Object.assign(new Error("Gone"), { statusCode: 410, body: "Gone" }),
    );

    await sendPushToUser(worker.id, { title: "Test", body: "Body" });

    const remaining = await (prisma as unknown as {
      pushSubscription: { count: (args: unknown) => Promise<number> };
    }).pushSubscription.count({ where: { userId: worker.id } });
    expect(remaining).toBe(0);
  });
});
