// Signed license tokens for Stripe-activated access. Reuses the same HMAC
// primitive and secret (LICENSE_SIGNING_SECRET) as the manual access-code
// system in lib/license/codes.ts — this is the same signing trust boundary,
// not a second license system. The payload just carries more structured data
// (a Stripe subscription id, precise timestamps) than a code needs to hold,
// since a token is never typed by hand: it round-trips between server and
// browser as an opaque string.
//
// Server-only: never import from a client component. The browser only ever
// stores and re-sends the resulting token; it cannot read or forge it.

import { createHmac, timingSafeEqual } from "crypto";

export type StripeLicenseRole = "premium" | "lifetime";

export interface StripeLicensePayload {
  role: StripeLicenseRole;
  issuedAt: string; // ISO
  expiresAt: string | null; // ISO; null = never (lifetime)
  /** Present for premium (needed to check renewal); absent for lifetime. */
  subscriptionId?: string;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Signs a Stripe-derived license payload into an opaque token. */
export function signStripeLicense(payload: StripeLicensePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export type StripeLicenseVerifyResult =
  | { ok: true; payload: StripeLicensePayload }
  | { ok: false };

function isStripeLicensePayload(v: unknown): v is StripeLicensePayload {
  const p = v as StripeLicensePayload;
  return (
    !!p &&
    typeof p === "object" &&
    (p.role === "premium" || p.role === "lifetime") &&
    typeof p.issuedAt === "string" &&
    (p.expiresAt === null || typeof p.expiresAt === "string") &&
    (p.subscriptionId === undefined || typeof p.subscriptionId === "string")
  );
}

/** Verifies a token's signature and shape. Never throws — malformed or
 *  tampered input simply fails verification. */
export function verifyStripeLicense(token: unknown, secret: string): StripeLicenseVerifyResult {
  if (typeof token !== "string" || token.length < 10 || token.length > 4000) return { ok: false };
  const dot = token.lastIndexOf(".");
  if (dot < 1) return { ok: false };
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false };
  }
  if (!isStripeLicensePayload(parsed)) return { ok: false };
  return { ok: true, payload: parsed };
}

/** Verifies against a list of keys (current + any retired ones) so a signing
 *  key can rotate without invalidating a token issued under the old key.
 *  Tries each in order, returns on the first success. */
export function verifyStripeLicenseWithRotation(
  token: unknown,
  secrets: string[]
): StripeLicenseVerifyResult {
  for (const secret of secrets) {
    const result = verifyStripeLicense(token, secret);
    if (result.ok) return result;
  }
  return { ok: false };
}
