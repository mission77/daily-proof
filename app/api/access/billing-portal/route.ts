import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { verifyStripeLicenseWithRotation } from "@/lib/license/stripeLicense";
import { verificationSecrets } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** POST /api/access/billing-portal { token }
 *
 *  Opens Stripe's Billing Portal for a Stripe-derived Premium license,
 *  without the browser ever holding or sending a Stripe customer id. The
 *  browser sends back its own signed license verbatim; the subscription id
 *  used to look up the customer comes only from inside that verified
 *  token — never from a separate field the browser could set independently
 *  (same trust model as /api/access/refresh). The customer id itself is
 *  read fresh from that verified subscription and never returned to the
 *  browser or stored anywhere — only the one-time portal URL is. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`billing-portal:${clientKey(req)}`, 10, 60_000)) {
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
    // Covers manually-generated Premium codes: they carry no Stripe
    // subscription, so there is nothing to open a billing portal for.
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
    console.error("billing portal: subscription retrieve failed");
    return fail("stripe_unavailable", 502);
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appUrl}/settings`,
    });
    return NextResponse.json({ ok: true, url: portalSession.url });
  } catch {
    console.error("billing portal: session create failed");
    return fail("portal_failed", 502);
  }
}
