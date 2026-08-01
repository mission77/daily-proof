"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAccessState, hasFullAccess } from "@/lib/repos/access";
import { maybeRefreshPremiumOnStart, retryPremiumRefreshOnReconnect } from "@/lib/repos/premiumRefresh";
import { getActiveSession } from "@/lib/repos/settings";
import { isUpdatePending } from "@/lib/updatePending";
import { Wordmark } from "@/components/Wordmark";
import { AccessCodeForm } from "@/components/AccessCodeForm";
import { RestoreAccessNotice } from "@/components/RestoreAccessNotice";
import { PlanPicker } from "@/components/PlanPicker";
import { BETA_MODE } from "@/lib/site";
import { useToast } from "@/components/Toast";

/** Guards Studio, Book, and Focus behind a valid access code (owner,
 *  lifetime, premium, or beta) — that is the product being sold. Settings is
 *  deliberately exempt: a person's own proof, and the Export/Import/Privacy/
 *  Theme/About sections that protect it, must always be reachable no matter
 *  what state their access is in. Only premium *functionality* is gated;
 *  never the user's own data. Local-first today: the license lives in
 *  IndexedDB. The shape is ready for server verification later — swap the
 *  loader for an entitlement check without touching callers. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();
  const settingsRoute = pathname.startsWith("/settings");
  const [blocked, setBlocked] = useState<boolean | null>(null);
  // True only when a premium subscription license specifically has lapsed
  // (as opposed to never having had one) — lets the lock screen explain
  // *why* calmly instead of just showing the generic no-access copy.
  const [expiredPremium, setExpiredPremium] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // A near-expiry premium license gets one quiet renewal attempt
        // before we decide whether to lock the page — this is "the
        // protected app starts" trigger from the refresh policy; it no-ops
        // instantly for every other role and for a premium license that
        // isn't close to expiring yet.
        await maybeRefreshPremiumOnStart();
        const state = await getAccessState();
        if (cancelled) return;
        setBlocked(!hasFullAccess(state));
        setExpiredPremium(state.role === "premium" && !hasFullAccess(state));

        // A downloaded update was held back while a Focus session was in
        // progress (see SWRegister). The moment that's no longer true —
        // session saved, or none ever started — apply it here.
        if (isUpdatePending() && !(await getActiveSession())) {
          window.location.reload();
        }
      } catch {
        // Fail closed: if storage can't confirm a license, show the lock
        // screen. A licensed user can redeem their code again; an anonymous
        // visitor must never slip through on an error.
        if (!cancelled) {
          setBlocked(true);
          setExpiredPremium(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Retry a renewal the moment connectivity returns, in case the app-start
  // attempt above happened while offline. Still only ever makes a network
  // call when a premium license is actually near expiry (see
  // lib/repos/premiumRefresh.ts) — this listener costs nothing otherwise.
  useEffect(() => {
    function onOnline() {
      (async () => {
        await retryPremiumRefreshOnReconnect();
        try {
          const state = await getAccessState();
          setBlocked(!hasFullAccess(state));
          setExpiredPremium(state.role === "premium" && !hasFullAccess(state));
        } catch {
          /* leave the current screen as-is on a transient read error */
        }
      })();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  if (blocked && !settingsRoute) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center px-1 py-6 text-center">
        <div>
          <Wordmark className="text-xl" />
          {BETA_MODE ? (
            <>
              <h1 className="mt-6 font-display text-[26px] font-semibold leading-tight sm:text-3xl">
                Daily Proof is in private beta.
              </h1>
              <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
                The app is open to invited members only. Enter your access code below to unlock
                Studio and Book on this device. Settings — including exporting your data — is
                always open, no code required.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-6 font-display text-[26px] font-semibold leading-tight sm:text-3xl">
                Unlock Daily Proof on this device.
              </h1>
              <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
                Studio and Book need an active plan or access code. Settings, including exporting
                your data, is always open, no code required.
              </p>
            </>
          )}
          {expiredPremium && (
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-faint">
              Your subscription access could not be renewed. If you&rsquo;re still subscribed, this
              should resolve automatically. Otherwise, redeem a new code below.
            </p>
          )}
          <div className="mx-auto mt-7 max-w-md text-left">
            <AccessCodeForm
              onSuccess={(_state, roleName) => {
                toast(`Access updated: ${roleName}`);
                setBlocked(false);
              }}
            />
          </div>
          {!BETA_MODE && (
            <div className="mx-auto mt-4 max-w-md text-left">
              <RestoreAccessNotice />
            </div>
          )}
          {BETA_MODE ? (
            <div className="mt-8">
              <p className="mx-auto max-w-md text-[14px] leading-relaxed text-ink-faint">
                No code yet? Request early access for the Founding Beta.
              </p>
              <Link href="/#beta" className="btn-primary mt-4">
                Request Early Access
              </Link>
            </div>
          ) : (
            <div className="mt-8 text-left">
              <PlanPicker />
            </div>
          )}
        </div>
      </div>
    );
  }

  // While the license loads (blocked === null) the page renders normally; the
  // lock swaps in only once the check confirms there is no valid license.
  // Everything behind the guard is the visitor's own local data, so the brief
  // render leaks nothing. No blank states, no flashes for licensed users.
  return <>{children}</>;
}
