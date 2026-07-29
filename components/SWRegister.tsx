"use client";

import { useEffect } from "react";
import { getActiveSession } from "@/lib/repos/settings";
import { markUpdatePending } from "@/lib/updatePending";

export function SWRegister() {
  useEffect(() => {
    // Local-first: the browser is the only home the data has. Ask it to mark
    // this origin's storage persistent so IndexedDB (the Book) can't be
    // silently evicted under storage pressure or after days of inactivity.
    try {
      navigator.storage?.persist?.().catch(() => {});
    } catch {
      /* older browsers: best-effort storage is all they offer */
    }

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
      // Never pull the page out from under an active Focus session — the
      // new version is already downloaded and waiting; AccessGuard applies
      // it itself the moment no session is in progress (session saved, or
      // never started). See lib/updatePending.ts.
      getActiveSession().then((session) => {
        if (session) {
          markUpdatePending();
        } else {
          window.location.reload();
        }
      });
    });
  }, []);

  return null;
}
