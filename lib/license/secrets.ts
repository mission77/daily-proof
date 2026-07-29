// License signing-key rotation. `LICENSE_SIGNING_SECRET` is the current key
// and the only one ever used to sign something new. `LICENSE_SIGNING_SECRET_PREVIOUS`
// optionally holds one or more retired keys (comma-separated) that must
// still *verify* successfully, so that rotating the current key never
// invalidates a license — manual code or Stripe-derived — signed before the
// rotation. Pure env-var configuration: no database, no migration, no
// downtime. To rotate: move the current value of LICENSE_SIGNING_SECRET into
// LICENSE_SIGNING_SECRET_PREVIOUS (comma-append if one is already there),
// then set LICENSE_SIGNING_SECRET to a freshly generated value.

/** The one key ever used to sign a new code or license. */
export function currentSigningSecret(): string | null {
  return process.env.LICENSE_SIGNING_SECRET || null;
}

/** Every key that must still verify: current first, then retired keys in
 *  the order listed. Empty when licensing isn't configured at all. */
export function verificationSecrets(): string[] {
  const current = process.env.LICENSE_SIGNING_SECRET;
  const previous = (process.env.LICENSE_SIGNING_SECRET_PREVIOUS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const all = current ? [current, ...previous] : previous;
  return Array.from(new Set(all));
}
