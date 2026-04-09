// Firebase Cloud Messaging push notification service

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Send push notification to a single device
export async function sendPush(
  fcmToken: string,
  payload: PushPayload
): Promise<PushResult> {
  if (!process.env.FCM_SERVER_KEY) {
    console.warn("[FCM] FCM_SERVER_KEY not configured — skipping push");
    return { success: false, error: "FCM not configured" };
  }

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { image: payload.imageUrl }),
        },
        data: payload.data || {},
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "gignow_default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      }),
    });

    const result = await response.json();

    if (result.success === 1) {
      return { success: true, messageId: result.results?.[0]?.message_id };
    }

    const error = result.results?.[0]?.error || "Unknown FCM error";

    // Handle token expiry
    if (error === "NotRegistered" || error === "InvalidRegistration") {
      // TODO: Remove expired token from database
      console.warn(`[FCM] Token expired/invalid: ${fcmToken.slice(0, 20)}...`);
    }

    return { success: false, error };
  } catch (error) {
    console.error("[FCM] Send failed:", error);
    return { success: false, error: String(error) };
  }
}

// Send push to multiple devices (batch)
export async function sendPushBatch(
  tokens: string[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    tokens.map((token) => sendPush(token, payload))
  );

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      if (result.status === "fulfilled" && result.value.error) {
        errors.push(result.value.error);
      } else if (result.status === "rejected") {
        errors.push(String(result.reason));
      }
    }
  }

  return { sent, failed, errors: [...new Set(errors)] };
}

// Pre-built notification payloads for common events
export const PUSH_TEMPLATES = {
  urgentMatch: (postTitle: string) => ({
    title: "급구! 지금 근처에서 일할 수 있어요",
    body: `${postTitle} — 지금 수락하면 바로 시작!`,
    data: { type: "URGENT_MATCH" },
  }),
  applicationAccepted: (companyName: string) => ({
    title: "지원이 수락되었어요!",
    body: `${companyName}에서 함께 일하고 싶어해요`,
    data: { type: "APPLICATION_ACCEPTED" },
  }),
  paymentCompleted: (amount: number) => ({
    title: "급여가 입금되었어요!",
    body: `${amount.toLocaleString()}원이 계좌에 들어왔어요`,
    data: { type: "PAYMENT_COMPLETED" },
  }),
  favoriteAvailable: (workerName: string) => ({
    title: "단골이 시간을 등록했어요",
    body: `${workerName}님이 가용시간을 등록했어요. 확인해보세요!`,
    data: { type: "FAVORITE_AVAILABLE" },
  }),
  favoritePost: (companyName: string) => ({
    title: "단골 업체에서 새 공고를 올렸어요",
    body: `${companyName}에서 새 일자리가 있어요. 먼저 확인해보세요!`,
    data: { type: "FAVORITE_POST" },
  }),
  checkoutReminder: (companyName: string) => ({
    title: "근무 완료 확인이 필요해요",
    body: `${companyName} 근무가 완료되었나요? 체크아웃해주세요`,
    data: { type: "CHECKOUT_REMINDER" },
  }),
} as const;
