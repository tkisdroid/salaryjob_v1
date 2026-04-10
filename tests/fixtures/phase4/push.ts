// Phase 4 Wave 0 test fixtures — Web Push mocks
//
// NOTE: These keys are syntactically valid VAPID format but NOT usable for real
// delivery. They are used in tests to exercise subscribe/unsubscribe/send paths
// with mocked `web-push` library.

export const MOCK_PUSH_KEYS = {
  endpoint: "https://fcm.googleapis.com/fcm/send/TEST-ENDPOINT-1234",
  p256dh:
    "BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9LdNnC7WNnmJMPs2X6kCbDSYvP0xu4rFBw5E0OLKrTx2rXo0Hq0c",
  auth: "tBHItJI5svbpez7KI4CCXg",
} as const;

export interface MockPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function buildMockSubscription(
  overrideEndpoint?: string,
): MockPushSubscription {
  return {
    endpoint: overrideEndpoint ?? MOCK_PUSH_KEYS.endpoint,
    keys: {
      p256dh: MOCK_PUSH_KEYS.p256dh,
      auth: MOCK_PUSH_KEYS.auth,
    },
  };
}
