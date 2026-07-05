// Access foundation only. No billing, no paywall enforcement yet.
// Owner: permanent access. Lifetime: one-time purchase. Premium: monthly. Free: 3-day trial.

import { STORES, idbGet, idbPut } from "@/lib/db";
import { AccessRole, AccessState, isAccessRecord, nowIso } from "@/lib/types";

export const TRIAL_DAYS = 3;

const isDev = process.env.NODE_ENV === "development";

export async function getAccessState(): Promise<AccessState> {
  const existing = await idbGet<unknown>(STORES.access, "access");
  if (isAccessRecord(existing)) return existing;
  // Missing or malformed (e.g. left by an older build): initialize fresh.
  // First launch: owner in development so the maker never sees a paywall while building;
  // free trial otherwise.
  const initial: AccessState = {
    key: "access",
    role: isDev ? "owner" : "free",
    trialStartedAt: isDev ? null : nowIso(),
    updatedAt: nowIso(),
  };
  await idbPut(STORES.access, initial);
  return initial;
}

export async function setAccessRole(role: AccessRole): Promise<AccessState> {
  const current = await getAccessState();
  const next: AccessState = {
    ...current,
    role,
    trialStartedAt: role === "free" ? current.trialStartedAt ?? nowIso() : current.trialStartedAt,
    updatedAt: nowIso(),
  };
  await idbPut(STORES.access, next);
  return next;
}

export function hasFullAccess(state: AccessState): boolean {
  return state.role === "owner" || state.role === "lifetime" || state.role === "premium";
}

export function trialDaysLeft(state: AccessState, now: Date = new Date()): number | null {
  if (state.role !== "free") return null;
  if (!state.trialStartedAt) return TRIAL_DAYS;
  const elapsed = now.getTime() - new Date(state.trialStartedAt).getTime();
  const left = TRIAL_DAYS - elapsed / 86_400_000;
  return Math.max(0, Math.ceil(left));
}

/** Whether the app is usable. Never blocks anyone today: billing is not wired,
 *  so free users past trial still get access. Flip enforceTrial when payments land. */
export function canUseApp(state: AccessState, opts: { enforceTrial?: boolean } = {}): boolean {
  if (hasFullAccess(state)) return true;
  if (!opts.enforceTrial) return true;
  const left = trialDaysLeft(state);
  return left === null || left > 0;
}

export function roleLabel(role: AccessRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "lifetime":
      return "Lifetime";
    case "premium":
      return "Premium";
    case "free":
      return "Free trial";
  }
}
