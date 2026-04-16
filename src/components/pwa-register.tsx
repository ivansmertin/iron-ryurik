"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Avoid hydration/cache issues during local development.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      // Clear all caches to ensure fresh dev chunks
      void caches.keys().then((keys) => {
        keys.forEach((key) => void caches.delete(key));
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("[pwa] service worker registration failed", error);
    });
  }, []);

  return null;
}
