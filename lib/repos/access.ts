// Access foundation. The app requires a valid access code: owner, lifetime,
// premium, or beta. "free" means no code has ever been redeemed, or a
// previously-redeemed one expired — it grants no protected functionality,
// but it is never a reason to hide the user's own data (see AccessGuard,
// which exempts Settings entirely).

import { STORES, idbGet, idbPut } from "@/lib/db";
import { AccessRole, AccessState, StoredLicense, isAccessRecord, nowIso } from "@/lib/types";

const isDev = process.env.NODE_ENV === "development";

export async function getAccessState(): Promise<AccessState> {
  const existing = await idbGet<unknown>(STORES.access, "access");
  if (isAccessRecord(existing)) return existing;
  // Missing or malformed (e.g. left by an older build): initialize fresh.
  // First launch: owner in development so the maker never sees a paywall
  // while building; no active plan otherwise.
  const initial: AccessState = {
    key: "access",
    role: isDev ? "owner" : "free",
    updatedAt: nowIso(),
  };
  await idbPut(STORES.access, initial);
  return initial;
}

export async function setAccessRole(role: AccessRole): Promise<AccessState> {
  const current = await getAccessState();
  const next: AccessState = { ...current, role, updatedAt: nowIso() };
  await idbPut(STORES.access, next);
  return next;
}

/** True when a stored license is past its expiry. */
export function licenseExpired(license: StoredLicense, now: Date = new Date()): boolean {
  return license.expiresAt !== null && new Date(license.expiresAt).getTime() < now.getTime();
}

/** The role that actually applies right now: an expired license (e.g. a beta
 *  code past its date) falls back to having no active plan. */
export function effectiveRole(state: AccessState, now: Date = new Date()): AccessRole {
  if (state.license && licenseExpired(state.license, now)) return "free";
  return state.role;
}

export function hasFullAccess(state: AccessState): boolean {
  const role = effectiveRole(state);
  return role === "owner" || role === "lifetime" || role === "premium" || role === "beta";
}

/** Saves a validated license and applies its role. Redeeming a new code
 *  simply replaces the previous license. Manual code redemption (Settings →
 *  Access, the lock-screen form) always calls this directly and
 *  unconditionally — that behavior is unchanged. */
export async function applyLicense(license: StoredLicense): Promise<AccessState> {
  const current = await getAccessState();
  const next: AccessState = {
    ...current,
    role: license.role,
    license,
    updatedAt: nowIso(),
  };
  await idbPut(STORES.access, next);
  return next;
}

/** Higher number = more privileged. Only used by the automatic Stripe
 *  checkout-activation flow below — manual code redemption never consults
 *  this and keeps replacing access unconditionally, as before. */
const ROLE_PRIORITY: Record<AccessRole, number> = {
  owner: 4,
  lifetime: 3,
  premium: 2,
  beta: 1,
  free: 0,
};

/** Applies a license only if it would not downgrade the browser's current
 *  effective access — e.g. a Stripe monthly-checkout activation must never
 *  overwrite an existing Owner or Lifetime grant. Equal-or-higher roles
 *  still replace (so re-running checkout activation, or renewing premium,
 *  stays idempotent). Used only by the automatic Stripe activation/refresh
 *  flow; manual code redemption is untouched and keeps calling
 *  applyLicense directly. */
export async function applyLicenseIfNotLower(license: StoredLicense): Promise<AccessState> {
  const current = await getAccessState();
  const currentRole = effectiveRole(current);
  if (ROLE_PRIORITY[license.role] < ROLE_PRIORITY[currentRole]) {
    return current;
  }
  return applyLicense(license);
}

export function roleLabel(role: AccessRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "lifetime":
      return "Lifetime";
    case "premium":
      return "Premium";
    case "beta":
      return "Beta";
    case "free":
      return "No active plan";
  }
}

/** A more precise label than roleLabel() for surfaces where it matters
 *  whether "premium" means an actual recurring Stripe subscription or just
 *  premium-tier access with nothing behind it to bill — a manually issued
 *  code (self-redeemed or gifted) and a dev-only role switch both produce
 *  role "premium" with no `license.token`, identical to a real Monthly
 *  subscription unless this distinction is made explicit. Settings' "Current
 *  plan" line uses this so the label never implies billing management is
 *  available when there is nothing to manage. */
export function planLabel(state: AccessState): string {
  const role = effectiveRole(state);
  if (role === "premium") {
    return state.license?.token ? "Monthly" : "Premium access code";
  }
  if (role === "lifetime") {
    return "Lifetime access";
  }
  return roleLabel(role);
}
