// RED BASELINE (Wave 0): until Plan 04-06 implements push subscribe/unsubscribe Server Actions.
// REQ: NOTIF-01 — Worker subscribes via PushSubscription model; row created/deleted accordingly.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestWorker,
  truncatePhase4Tables,
  buildMockSubscription,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
// @ts-expect-error — Plan 04-06 will provide these
import { subscribePush, unsubscribePush } from "@/lib/actions/push-actions";

describe.skipIf(skipIfNoSupabase())("NOTIF-01 push subscribe / unsubscribe", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
    vi.restoreAllMocks();
  });

  it("subscribePush creates a PushSubscription row for the current user", async () => {
    const worker = await createTestWorker();
    // Mock dal.requireWorker to return our test user
    vi.doMock("@/lib/dal", () => ({
      requireWorker: async () => ({ id: worker.id }),
    }));

    const sub = buildMockSubscription();
    const result = await subscribePush(sub);
    expect(result.success).toBe(true);

    // PushSubscription model added in Plan 04-02 — until then this is RED.
    const rows = await (prisma as unknown as {
      pushSubscription: { findMany: (args: unknown) => Promise<unknown[]> };
    }).pushSubscription.findMany({ where: { userId: worker.id } });
    expect(rows.length).toBe(1);
  });

  it("unsubscribePush deletes the PushSubscription row by endpoint", async () => {
    const worker = await createTestWorker();
    vi.doMock("@/lib/dal", () => ({
      requireWorker: async () => ({ id: worker.id }),
    }));

    const sub = buildMockSubscription();
    await subscribePush(sub);

    const result = await unsubscribePush(sub.endpoint);
    expect(result.success).toBe(true);

    const rows = await (prisma as unknown as {
      pushSubscription: { findMany: (args: unknown) => Promise<unknown[]> };
    }).pushSubscription.findMany({ where: { userId: worker.id } });
    expect(rows.length).toBe(0);
  });
});
