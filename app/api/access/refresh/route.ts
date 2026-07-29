import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { signStripeLicense, verifyStripeLicenseWithRotation } from "@/lib/license/stripeLicense";
import { currentSigningSecret, verificationSecrets } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const PREMIUM_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7-day local renewal window

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** POST /api/access/refresh { token }
 *
 *  Renews a premium license shortly before it expires. The browser sends
 *  back its own signed license verbatim; the subscription id used to check
 *  Stripe comes only from inside that verified token — never from a
 *  separate field the browser could set independently. Owner, Beta, and
 *  Lifetime never call this endpoint (see lib/repos/premiumRefresh.ts).
 *
 *  Renews only on `trialing` or `active`. Every other status — including
 *  `past_due` — is rejected outright: no grace period is computed here.
 *  The already-signed 7-day local license is the tolerance mechanism for a
 *  lapsed payment (same as it is for being offline); this endpoint does not
 *  try to infer how long a subscription has been past_due from a billing
 *  timestamp. A rejected renewal never force-revokes access early — it just
 *  leaves the existing local license to expire on its own signed schedule
 *  (see AccessGuard/premiumRefresh). */
export async function POST(req: NextRequest) {
  if (!rateLimit(`refresh:${clientKey(req)}`, 20, 60_000)) {
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

  // Tries the current signing key first, then any retired ones — a license
  // issued before a key rotation must keep refreshing.
  const verified = verifyStripeLicenseWithRotation(token, secrets);
  if (!verified.ok) {
    return fail("invalid_license", 401);
  }
  const { payload } = verified;
  if (payload.role !== "premium") {
    return fail("not_premium", 400);
  }
  if (!payload.subscriptionId) {
    return fail("invalid_license", 400);
  }

  const stripe = getStripe(env);
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(payload.subscriptionId);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return fail("invalid_subscription", 200);
    }
    console.error("access refresh: subscription retrieve failed");
    return fail("stripe_unavailable", 502);
  }

  const renew = () => {
    const next = {
      role: "premium" as const,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + PREMIUM_EXPIRY_MS).toISOString(),
      subscriptionId: sub.id,
    };
    const nextToken = signStripeLicense(next, signingSecret!);
    return NextResponse.json({ ok: true, role: next.role, expiresAt: next.expiresAt, token: nextToken });
  };

  if (sub.status === "trialing" || sub.status === "active") {
    return renew();
  }

  // past_due, canceled, unpaid, incomplete, incomplete_expired, paused, or
  // any unknown status: reject outright, no partial-credit grace window.
  return fail("subscription_inactive", 200);
}
