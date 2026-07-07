"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAccessState, hasFullAccess, trialDaysLeft } from "@/lib/repos/access";
import { Wordmark } from "@/components/Wordmark";
import { PlanPicker } from "@/components/PlanPicker";
import { BETA_MODE } from "@/lib/site";

/** Guards the app for expired free users. Local-first today: the role lives
 *  in IndexedDB. The shape is ready for server verification later — swap the
 *  loader for an entitlement check without touching callers.
 *
 *  Settings stays reachable no matter what: a person's proof is theirs, and
 *  export/backup must never sit behind a paywall. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await getAccessState();
        const expired =
          !hasFullAccess(state) && (trialDaysLeft(state) ?? 0) <= 0;
        if (!cancelled) setBlocked(expired);
      } catch {
        // If storage fails we cannot know the role; never lock someone out on an error.
        if (!cancelled) setBlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const settingsRoute = pathname.startsWith("/settings");
  if (blocked && !settingsRoute) {
    return (
      <div className="mx-auto w-full max-w-xl px-1 py-6 text-center">
        <Wordmark className="text-xl" />
        <h1 className="mt-6 font-display text-[26px] font-semibold leading-tight sm:text-3xl">
          Your trial has ended.
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-soft">
          Keep collecting proof with a plan below. Everything you saved stays on your device —
          you can{" "}
          <Link href="/settings" className="underline underline-offset-2">
            export your Book
          </Link>{" "}
          anytime.
        </p>
        {BETA_MODE ? (
          <div className="mt-8">
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink-soft">
              Daily Proof is in a private beta. If you have an access code, enter it in{" "}
              <Link href="/settings" className="underline underline-offset-2">
                Settings → Access
              </Link>{" "}
              — or request an invitation for the Founding Beta.
            </p>
            <Link href="/#beta" className="btn-primary mt-6 inline-flex px-7 py-3">
              Request Beta Invitation
            </Link>
          </div>
        ) : (
          <div className="mt-8 text-left">
            <PlanPicker />
          </div>
        )}
      </div>
    );
  }

  // While the role loads (blocked === null) the page renders normally; the
  // guard swaps in only once expiry is confirmed. No blank states, no flashes.
  return <>{children}</>;
}
