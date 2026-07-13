"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAccessState, hasFullAccess } from "@/lib/repos/access";
import { Wordmark } from "@/components/Wordmark";
import { AccessCodeForm } from "@/components/AccessCodeForm";
import { PlanPicker } from "@/components/PlanPicker";
import { BETA_MODE } from "@/lib/site";
import { useToast } from "@/components/Toast";

/** Guards the app: Studio, Book, Settings, and Focus require a valid access
 *  code (owner, lifetime, premium, or beta). There is no free tier and no
 *  trial window — visitors without a code see the lock screen, which is also
 *  where a code gets redeemed. Local-first today: the license lives in
 *  IndexedDB. The shape is ready for server verification later — swap the
 *  loader for an entitlement check without touching callers. */
export function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toast = useToast();
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await getAccessState();
        if (!cancelled) setBlocked(!hasFullAccess(state));
      } catch {
        // Fail closed: if storage can't confirm a license, show the lock
        // screen. A licensed user can redeem their code again; an anonymous
        // visitor must never slip through on an error.
        if (!cancelled) setBlocked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (blocked) {
    return (
      <div className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col justify-center px-1 py-6 text-center">
        <div>
          <Wordmark className="text-xl" />
          <h1 className="mt-6 font-display text-[26px] font-semibold leading-tight sm:text-3xl">
            Daily Proof is in private beta.
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">
            The app is open to invited members only. Enter your access code below to unlock
            Studio, Book, and Settings on this device.
          </p>
          <div className="mx-auto mt-7 max-w-md text-left">
            <AccessCodeForm
              onSuccess={(_state, roleName) => {
                toast(`Access updated: ${roleName}`);
                setBlocked(false);
              }}
            />
          </div>
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
