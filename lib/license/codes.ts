// License codes — no accounts, no passwords, privacy-first.
//
// A code is self-validating: `PREFIX-PAYLOAD-SIGNATURE`, where the payload
// encodes role + expiry + nonce and the signature is an HMAC over the payload
// using LICENSE_SIGNING_SECRET. The server can therefore validate any code
// with zero database. An optional Redis store (see store.ts) adds max-use
// counting and revocation on top.

import { createHmac, timingSafeEqual } from "crypto";

export type LicenseRole = "owner" | "lifetime" | "premium" | "beta";

const ROLE_CHAR: Record<LicenseRole, string> = {
  owner: "O",
  lifetime: "L",
  premium: "P",
  beta: "B",
};
const CHAR_ROLE: Record<string, LicenseRole> = { O: "owner", L: "lifetime", P: "premium", B: "beta" };

export const ROLE_PREFIX: Record<LicenseRole, string> = {
  owner: "OWNER",
  lifetime: "LIFE",
  premium: "PRO",
  beta: "BETA",
};
// Cosmetic alternates that also map to a role (e.g. FOUNDER-… lifetime codes).
const PREFIX_ROLE: Record<string, LicenseRole> = {
  OWNER: "owner",
  LIFE: "lifetime",
  FOUNDER: "lifetime",
  PRO: "premium",
  BETA: "beta",
};

const B32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // no I/L/O/U/0/1 — unambiguous when read aloud

function b32(bytes: Buffer, len: number): string {
  let out = "";
  for (let i = 0; out.length < len; i++) out += B32[bytes[i % bytes.length] % B32.length];
  return out;
}

/** Days since 2026-01-01, base36, 4 chars. "0000" means never expires. */
function encodeExpiry(expiresAt: Date | null): string {
  if (!expiresAt) return "0000";
  const days = Math.ceil((expiresAt.getTime() - Date.UTC(2026, 0, 1)) / 86400000);
  return Math.max(1, days).toString(36).toUpperCase().padStart(4, "0");
}

function decodeExpiry(s: string): Date | null {
  if (s === "0000") return null;
  const days = parseInt(s, 36);
  if (!Number.isFinite(days) || days < 1) throw new Error("bad expiry");
  return new Date(Date.UTC(2026, 0, 1) + days * 86400000);
}

function sign(payload: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(payload).digest();
  return b32(mac, 10);
}

export interface GenerateOptions {
  role: LicenseRole;
  expiresAt?: Date | null;
  prefix?: string; // cosmetic, must map to the same role
  nonce?: string; // 4 chars; random when omitted
}

export function generateCode(opts: GenerateOptions, secret: string): string {
  const prefix = (opts.prefix ?? ROLE_PREFIX[opts.role]).toUpperCase();
  if (PREFIX_ROLE[prefix] !== opts.role) throw new Error(`Prefix ${prefix} does not match role ${opts.role}`);
  const nonce =
    opts.nonce?.toUpperCase() ??
    b32(Buffer.from(Array.from({ length: 8 }, () => Math.floor(Math.random() * 256))), 4);
  const payload = `${ROLE_CHAR[opts.role]}${encodeExpiry(opts.expiresAt ?? null)}${nonce}`;
  return `${prefix}-${payload}-${sign(payload, secret)}`;
}

export interface VerifiedCode {
  role: LicenseRole;
  expiresAt: string | null; // ISO
  codeId: string; // stable id for use-counting: payload string
}

export type VerifyResult =
  | { ok: true; license: VerifiedCode }
  | { ok: false; reason: "malformed" | "invalid_signature" | "expired" };

export function verifyCode(code: string, secret: string): VerifyResult {
  const cleaned = code.trim().toUpperCase();
  const m = cleaned.match(/^([A-Z]+)-([A-Z0-9]{9})-([A-Z0-9]{10})$/);
  if (!m) return { ok: false, reason: "malformed" };
  const [, prefix, payload, sig] = m;
  const role = CHAR_ROLE[payload[0]];
  if (!role || PREFIX_ROLE[prefix] !== role) return { ok: false, reason: "malformed" };
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "invalid_signature" };
  let expiresAt: Date | null;
  try {
    expiresAt = decodeExpiry(payload.slice(1, 5));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (expiresAt && expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, license: { role, expiresAt: expiresAt ? expiresAt.toISOString() : null, codeId: payload } };
}
