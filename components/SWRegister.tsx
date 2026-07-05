"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshed = false;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for a fresh worker on every page load so updates roll out quickly.
      reg.update().catch(() => {});
    });

    // Reload only when a NEW worker replaces an existing one (a real update).
    // On first install controllerchange also fires (clients.claim), and
    // reloading then would yank the page out from under a first-time user.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) return;
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });
  }, []);

  return null;
}
