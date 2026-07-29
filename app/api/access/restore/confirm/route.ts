import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { findEligibleCustomerById } from "@/lib/stripe/restoreEligibility";
import { verifyRestoreTokenWithRotation } from "@/lib/license/restoreToken";
import { signStripeLicense } from "@/lib/license/stripeLicense";
import { currentSigningSecret, verificationSecrets } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const PREMIUM_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // same local renewal window as activate/refresh

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** POST /api/access/restore/confirm { token }
 *
 *  The second half of restore-access: exchanges a clicked restore-link
 *  token for a fresh signed license. The token only proves *which Stripe
 *  customer* this is (see lib/license/restoreToken.ts) — role and status
 *  are always re-checked live against Stripe here, never trusted from the
 *  token or from anything the browser sends, same trust model as
 *  /api/checkout/activate and /api/access/refresh. A subscription that
 *  lapsed between requesting and clicking the link is correctly rejected.
 *
 *  Restoring access never reads, writes, or transmits local proof data —
 *  the browser only receives a signed license, exactly like a Stripe
 *  checkout activation, and applies it via applyLicenseIfNotLower so this
 *  can never downgrade an existing Owner or Lifetime grant. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`restore-confirm:${clientKey(req)}`, 10, 60_000)) {
    return fail("rate_limited", 429);
  }

  const env = readStripeEnv();
  const signingSecret = currentSigningSecret();
  const secrets = verificationSecrets();
  if (!env || !signingSecret || secrets.length === 0) {
    return fail("not_configured", 503);
  }

  let token: unknown;
  try {
    token = (await req.json())?.token;
  } catch {
    return fail("invalid_body", 400);
  }

  const verified = verifyRestoreTokenWithRotation(token, secrets);
  if (!verified.ok) {
    return fail("invalid_or_expired_link", 401);
  }

  const stripe = getStripe(env);
  let eligible;
  try {
    eligible = await findEligibleCustomerById(stripe, env, verified.payload.customerId);
  } catch {
    console.error("restore confirm: eligibility lookup failed");
    return fail("stripe_unavailable", 502);
  }

  if (!eligible) {
    // Covers canceled, refunded, unpaid, incomplete, and past_due — the
    // purchase that made this link eligible to be sent no longer qualifies.
    return fail("no_active_purchase", 200);
  }

  const payload =
    eligible.role === "premium"
      ? {
          role: "premium" as const,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + PREMIUM_EXPIRY_MS).toISOString(),
          subscriptionId: eligible.subscriptionId!,
        }
      : {
          role: "lifetime" as const,
          issuedAt: new Date().toISOString(),
          expiresAt: null,
        };

  const licenseToken = signStripeLicense(payload, signingSecret);
  return NextResponse.json({ ok: true, role: payload.role, expiresAt: payload.expiresAt, token: licenseToken });
}
