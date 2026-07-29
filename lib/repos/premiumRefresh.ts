// Client-side trigger for premium subscription renewal. Owner, Beta, and
// Lifetime never call this — see the role check inside attemptRenewal.
// Network activity is minimal by design: at most once per page load, and
// only when the local premium license is within 24 hours of its signed
// expiry. A failed or unreachable refresh never revokes access — it simply
// leaves the existing signed license in place until its own expiresAt,
// which AccessGuard already enforces. That is what keeps an offline device
// or an active focus session from being interrupted.

import { AccessState, StoredLicense } from "@/lib/types";
import { applyLicenseIfNotLower, getAccessState } from "./access";

const NEAR_EXPIRY_MS = 24 * 60 * 60 * 1000;
const RECONNECT_COOLDOWN_MS = 30_000;

let attemptedThisLoad = false;
let lastAttemptAt = 0;

async function attemptRenewal(state: AccessState): Promise<void> {
  if (state.role !== "premium") return; // Owner/Beta/Lifetime never refresh
  const license = state.license;
  // Manually-redeemed premium codes carry no Stripe subscription to check;
  // they simply expire on their own signed schedule, unchanged by this flow.
  if (!license?.token) return;
  if (!license.expiresAt) return;
  const msLeft = new Date(license.expiresAt).getTime() - Date.now();
  if (msLeft > NEAR_EXPIRY_MS) return; // plenty of time left: no network call

  lastAttemptAt = Date.now();
  try {
    const res = await fetch("/api/access/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: license.token }),
    });
    if (!res.ok) return; // not configured / Stripe unreachable: stay silent, retry later
    const data = await res.json().catch(() => null);
    if (data?.ok && typeof data.token === "string" && typeof data.expiresAt === "string") {
      const next: StoredLicense = {
        code: license.code,
        role: "premium",
        expiresAt: data.expiresAt,
        validatedAt: new Date().toISOString(),
        token: data.token,
      };
      // applyLicenseIfNotLower (not applyLicense): if another tab granted a
      // higher role since we read `state`, a renewal response must not
      // stomp it back down to premium.
      await applyLicenseIfNotLower(next);
    }
    // data.ok === false is a definitive "not renewable right now" — never
    // actively revoke here. The existing local license keeps governing
    // access until it actually expires.
  } catch {
    // Offline or network failure: keep using the existing local license.
  }
}

/** Call once when a protected page mounts ("the protected app starts").
 *  A module-level flag caps this to one attempt per hard page load even
 *  though AccessGuard's effect can re-run across in-app navigation between
 *  Studio/Book/Settings/Focus. */
export async function maybeRefreshPremiumOnStart(): Promise<void> {
  if (attemptedThisLoad) return;
  attemptedThisLoad = true;
  await attemptRenewal(await getAccessState());
}

/** Call when the browser regains connectivity. Bypasses the once-per-load
 *  guard above (an earlier attempt may have failed while offline) but still
 *  only makes a network call when actually near expiry, and is
 *  rate-limited so rapid online/offline flapping can't spam the endpoint. */
export async function retryPremiumRefreshOnReconnect(): Promise<void> {
  if (Date.now() - lastAttemptAt < RECONNECT_COOLDOWN_MS) return;
  await attemptRenewal(await getAccessState());
}
