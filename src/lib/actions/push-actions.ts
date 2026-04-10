"use server";

import { z } from "zod";
import { requireWorker } from "@/lib/dal";
import { prisma } from "@/lib/db";

/**
 * Phase 4 D-20 — Web Push subscribe / unsubscribe Server Actions.
 *
 * Accepts the standard PushSubscription JSON shape
 *   { endpoint, keys: { p256dh, auth } }
 * because that is exactly what `navigator.serviceWorker.ready.pushManager
 * .subscribe(...).toJSON()` returns on the client.
 *
 * Ownership model:
 *   - userId is taken from the current session via `requireWorker`, NEVER
 *     from the input. The client cannot claim to be another user.
 *   - Upsert by endpoint: re-subscribing with the same browser updates the
 *     row in place (keys rotate periodically on some push services).
 */

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type PushSubscribeInput = z.infer<typeof subscribeSchema>;

export type PushSubscribeResult =
  | { success: true; id: string }
  | { success: false; error: "invalid_input" | "unknown" };

export async function subscribePush(
  input: PushSubscribeInput,
): Promise<PushSubscribeResult> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "invalid_input" };

  try {
    const session = await requireWorker();
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: session.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      update: {
        userId: session.id,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        lastUsedAt: new Date(),
      },
    });
    return { success: true, id: sub.id };
  } catch (e) {
    console.error("[subscribePush]", e);
    return { success: false, error: "unknown" };
  }
}

export type PushUnsubscribeResult = { success: boolean };

export async function unsubscribePush(
  endpoint: string,
): Promise<PushUnsubscribeResult> {
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return { success: false };
  }
  try {
    const session = await requireWorker();
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.id },
    });
    return { success: true };
  } catch (e) {
    console.error("[unsubscribePush]", e);
    return { success: false };
  }
}
