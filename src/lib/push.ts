import "server-only";
import * as webpushNs from "web-push";
import { prisma } from "@/lib/db";

// web-push ships as CommonJS with `module.exports = { setVapidDetails, sendNotification, ... }`.
// In ESM interop that object is exposed both as the default export and as a namespace.
// Vitest's `vi.mock("web-push", factory)` lets a test swap either shape, so we resolve
// the function handles through whichever binding the mock populated at call time.
//
// IMPORTANT: Do NOT cache these at module-load time — vi.mock rebinds them after first import.
type WebPush = {
  setVapidDetails: (subject: string, pub: string, priv: string) => void;
  sendNotification: (
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ) => Promise<unknown>;
};

function resolveWebPush(): WebPush {
  const ns = webpushNs as unknown as Record<string, unknown> & {
    default?: Record<string, unknown>;
  };
  const pick = (k: "setVapidDetails" | "sendNotification") => {
    const top = ns[k];
    if (typeof top === "function") return top;
    const fromDefault = ns.default?.[k];
    if (typeof fromDefault === "function") return fromDefault;
    throw new Error(`[push] web-push.${k} is not a function`);
  };
  return {
    setVapidDetails: pick("setVapidDetails") as WebPush["setVapidDetails"],
    sendNotification: pick("sendNotification") as WebPush["sendNotification"],
  };
}

/**
 * Phase 4 D-19/D-20 — Web Push sender.
 *
 * `sendPushToUser` is the ONE entry point used by all Server Actions that need
 * to notify a user. It is fire-and-forget by contract:
 *
 *   - allSettled over every device → one dead endpoint never blocks the rest.
 *   - 410 Gone / 404 Not Found → delete the PushSubscription row (the browser
 *     has revoked permission or the endpoint has moved).
 *   - Any other error → log and swallow (so the calling action's success path
 *     is not poisoned by a transient push failure).
 *
 * MUST be awaited AFTER the caller's DB transaction has committed, never
 * inside one, because delivery can take 1–3 seconds per endpoint.
 */

export type PushPayloadType =
  | "accepted"
  | "rejected"
  | "new-application"
  | "reminder";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: PushPayloadType;
};

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? "mailto:dev@gignow.local";
  if (!pub || !priv) {
    console.warn(
      "[push] WEB_PUSH_VAPID_* env vars missing — push notifications disabled",
    );
    return false;
  }
  resolveWebPush().setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

/**
 * Send a Web Push notification to every active device of a user.
 * Returns only after every send attempt has settled (success or failure).
 *
 * Delivery contract:
 *   - 410 Gone / 404 Not Found → subscription is dead, deleted from DB.
 *   - Other errors → logged and swallowed. Never thrown.
 *   - No devices → no-op success.
 *   - VAPID env missing → no-op warning (dev-mode convenience).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const serialized = JSON.stringify(payload);
  const wp = resolveWebPush();

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          serialized,
        );
        // Successful delivery — bump lastUsedAt for observability.
        await prisma.pushSubscription
          .update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() },
          })
          .catch(() => {
            /* lastUsedAt bump is best-effort; row may have been deleted */
          });
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 410 || statusCode === 404) {
          // Dead endpoint — browser revoked permission or endpoint moved.
          // Remove the row so the next call doesn't waste a round-trip.
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {
              /* concurrent delete is fine */
            });
          console.warn(
            `[push] removed dead subscription ${sub.id} (status ${statusCode})`,
          );
        } else {
          console.error(
            `[push] delivery failed for subscription ${sub.id}:`,
            err,
          );
        }
      }
    }),
  );
}
