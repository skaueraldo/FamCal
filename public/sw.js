// famcal-sw v2 — notifications only; do not intercept page loads.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tab = event.notification.data?.tab || "calendar";
  const target = new URL("/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          client.postMessage({ type: "open-tab", tab });
          return;
        }
      }
      const opened = await self.clients.openWindow(target);
      opened?.postMessage({ type: "open-tab", tab });
    })(),
  );
});
