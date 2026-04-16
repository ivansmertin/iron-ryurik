const STATIC_CACHE = "iron-rurik-static-v3";
const NAV_CACHE = "iron-rurik-nav-v3";
const OFFLINE_URL = "/offline.html";

// Assets with content-hashed URLs — safe to cache forever.
const STATIC_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== NAV_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // ── 1. Next.js static chunks — Cache First (content-hashed, immutable) ──
  const isNextStatic = url.pathname.startsWith("/_next/static/");
  const isStaticFile =
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname === "/manifest.webmanifest";

  if (isNextStatic || isStaticFile) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      }),
    );
    return;
  }

  // ── 2. Navigation requests — Stale-While-Revalidate ──
  // Serve cached page shell immediately, refresh in background.
  // This makes repeat opens feel instant on iPhone.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(NAV_CACHE).then(async (cache) => {
        const cached = await cache.match(request);

        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(async () => {
            // Offline fallback
            return cached ?? caches.match(OFFLINE_URL);
          });

        // Return cached immediately if available, otherwise wait for network.
        return cached ?? networkFetch;
      }),
    );
    return;
  }

  // ── 3. Everything else — Network First with cache fallback ──
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(NAV_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }),
  );
});

// ==========================================
// WEB PUSH NOTIFICATIONS
// ==========================================

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Железный Рюрик";
    const options = {
      body: data.body || "У вас новое уведомление!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: data.data || { url: "/" },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Failed to parse push data", err);
    // Fallback if payload isn't JSON
    event.waitUntil(self.registration.showNotification("Железный Рюрик", { body: event.data.text(), icon: "/icon-192.png" }));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If app already open, focus it
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    }),
  );
});
