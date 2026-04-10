// Phase 4 D-19/D-20 — GigNow Web Push Service Worker
// Served from /sw.js at root scope by Next.js (public/ folder).
// Registration: src/components/providers/service-worker-registrar.tsx
//
// Responsibilities:
//   1. push            → display OS notification from server-sent JSON payload
//   2. notificationclick → focus existing window or open new one at payload.url
//
// This SW intentionally does NOT intercept fetch. Caching/offline is a
// Phase 5 concern; for now we only want push delivery + click routing.

self.addEventListener("install", () => {
  // Take over immediately so a page refresh activates the new SW without
  // requiring a browser restart.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  /** @type {{ title: string; body: string; url?: string; type?: string }} */
  let payload = {
    title: "GigNow",
    body: "새 알림이 도착했습니다",
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
    } catch (_e) {
      // Not JSON — fall back to raw text as body.
      try {
        payload.body = event.data.text() || payload.body;
      } catch (_e2) {
        /* keep default body */
      }
    }
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png", // optional — browser falls back if missing
    badge: "/icons/badge-72.png",
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
      // Prefer an already-open GigNow tab: navigate it and focus.
      for (const client of allClients) {
        if ("focus" in client && "navigate" in client) {
          try {
            await client.navigate(url);
          } catch (_err) {
            /* cross-origin redirect etc. — open a new window below */
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
