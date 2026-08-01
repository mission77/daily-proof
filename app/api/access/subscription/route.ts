import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { verifyStripeLicenseWithRotation } from "@/lib/license/stripeLicense";
import { verificationSecrets } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";
import { getAccountTimezone } from "@/lib/stripe/accountTimezone";

export const runtime = "nodejs";

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** POST /api/access/subscription { token }
 *
 *  Read-only billing status for Settings' "Current plan" line. The signed
 *  license the browser already holds is the only input — the subscription
 *  id used to query Stripe comes only from inside that verified token,
 *  never from a separate field the browser could set independently (same
 *  trust model as /api/access/billing-portal and /api/access/refresh).
 *
 *  Returns only what Settings needs to describe billing honestly: status,
 *  trial end, current period end, and whether the subscription is set to
 *  cancel. Never a customer id, never the subscription id, never any
 *  payment detail. This never touches or mutates the local license — its
 *  7-day rolling expiresAt stays exactly what it always was, an offline-
 *  tolerance cache, and is never a fallback for what this endpoint
 *  returns. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`subscription-status:${clientKey(req)}`, 20, 60_000)) {
    return fail("rate_limited", 429);
  }

  const env = readStripeEnv();
  const secrets = verificationSecrets();
  if (!env || secrets.length === 0) {
    return fail("not_configured", 503);
  }

  let token: unknown;
  try {
    token = (await req.json())?.token;
  } catch {
    return fail("invalid_body", 400);
  }

  const verified = verifyStripeLicenseWithRotation(token, secrets);
  if (!verified.ok) {
    return fail("invalid_license", 401);
  }
  const { payload } = verified;
  if (payload.role !== "premium") {
    return fail("not_premium", 400);
  }
  if (!payload.subscriptionId) {
    // A manually issued Premium code: nothing in Stripe to describe.
    return fail("invalid_subscription", 400);
  }

  const stripe = getStripe(env);
  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(payload.subscriptionId);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return fail("invalid_subscription", 200);
    }
    console.error("subscription status: retrieve failed");
    return fail("stripe_unavailable", 502);
  }

  // As of this Stripe API version, the period end lives on the subscription
  // item, not the subscription itself — the item matching the configured
  // monthly price (falling back to the first item) is the one Daily Proof
  // actually bills on.
  const item = sub.items.data.find((i) => i.price.id === env.monthlyPriceId) ?? sub.items.data[0];
  const currentPeriodEnd = item?.current_period_end;

  // The Billing Portal doesn't render these instants in UTC — Stripe's own
  // documented fallback for customer-facing dates is account-timezone
  // before UTC. A failed lookup here degrades to null (the client then
  // formats in UTC), never to blocking the response.
  const timezone = await getAccountTimezone(stripe);

  return NextResponse.json({
    ok: true,
    status: sub.status,
    trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    timezone,
  });
}
