// Short-lived, purpose-scoped tokens for the email-verified restore-access
// flow (see app/api/access/restore). Deliberately a separate payload shape
// from StripeLicensePayload (lib/license/stripeLicense.ts) even though it
// reuses the same HMAC primitive and signing secret (same trust boundary as
// the rest of lib/license/*): a restore token proves "this email was just
// sent this link", not "this device has access" — the two must never be
// interchangeable, so a restore token can't be replayed as an access
// license or vice versa.
//
// Server-only: never import from a client component.

import { createHmac, timingSafeEqual } from "crypto";

export interface RestoreTokenPayload {
  purpose: "restore-access";
  /** Stripe customer id. Never exposed to the browser except inside this
   *  signed, short-lived token. */
  customerId: string;
  email: string; // lowercased, trimmed
  issuedAt: string; // ISO
  expiresAt: string; // ISO
}

// Long enough to open an email, short enough to limit exposure if a link
// leaks (forwarded, cached by a mail scanner, left in an old inbox).
const TTL_MS = 20 * 60 * 1000;

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signRestoreToken(customerId: string, email: string, secret: string): string {
  const payload: RestoreTokenPayload = {
    purpose: "restore-access",
    customerId,
    email,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export type RestoreTokenVerifyResult = { ok: true; payload: RestoreTokenPayload } | { ok: false };

function isRestoreTokenPayload(v: unknown): v is RestoreTokenPayload {
  const p = v as RestoreTokenPayload;
  return (
    !!p &&
    typeof p === "object" &&
    p.purpose === "restore-access" &&
    typeof p.customerId === "string" &&
    typeof p.email === "string" &&
    typeof p.issuedAt === "string" &&
    typeof p.expiresAt === "string"
  );
}

/** Verifies signature, shape, and expiry. Never throws — malformed,
 *  tampered, or expired input simply fails verification. */
export function verifyRestoreToken(token: unknown, secret: string): RestoreTokenVerifyResult {
  if (typeof token !== "string" || token.length < 10 || token.length > 2000) return { ok: false };
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
  if (!isRestoreTokenPayload(parsed)) return { ok: false };
  if (new Date(parsed.expiresAt).getTime() < Date.now()) return { ok: false };
  return { ok: true, payload: parsed };
}

/** Verifies against current + retired signing keys, same rotation pattern
 *  as verifyStripeLicenseWithRotation. */
export function verifyRestoreTokenWithRotation(token: unknown, secrets: string[]): RestoreTokenVerifyResult {
  for (const secret of secrets) {
    const result = verifyRestoreToken(token, secret);
    if (result.ok) return result;
  }
  return { ok: false };
}
