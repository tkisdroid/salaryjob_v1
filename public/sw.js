// 샐러리잡 web-push service worker. v2 — brand rename, cache bust.
// Served from /sw.js at the root scope by Next.js via the public/ folder.

const SW_VERSION = "salaryjob-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  /** @type {{ title: string; body: string; url?: string; type?: string }} */
  let payload = {
    title: "샐러리잡",
    body: "새 알림이 도착했습니다.",
    url: "/",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        url: parsed.url || payload.url,
        type: parsed.type,
      };
    } catch {
      try {
        payload.body = event.data.text() || payload.body;
      } catch {
        // Keep the default body when the payload cannot be read as text.
      }
    }
  }

  const options = {
    body: payload.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: payload.url, type: payload.type },
    tag: payload.type || "default",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client && "navigate" in client) {
          try {
            await client.navigate(url);
          } catch {
            // Fall back to opening a new tab below when navigation fails.
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })(),
  );
});
