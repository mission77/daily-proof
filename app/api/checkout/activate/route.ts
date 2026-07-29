import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { signStripeLicense } from "@/lib/license/stripeLicense";
import { currentSigningSecret } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const PREMIUM_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7-day local renewal window

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** POST /api/checkout/activate { sessionId }
 *
 *  Server-only Checkout activation: turns a completed Stripe Checkout
 *  Session into a signed local license, without accounts, email, or a
 *  customer database. The plan is determined only from the Stripe price ID
 *  actually purchased — never from anything the browser claims. See
 *  lib/license/stripeLicense.ts for the signing primitive (same secret,
 *  same trust model as the manual access-code system in lib/license/codes.ts —
 *  this is not a second license system). */
export async function POST(req: NextRequest) {
  if (!rateLimit(`activate:${clientKey(req)}`, 10, 60_000)) {
    return fail("rate_limited", 429);
  }

  const env = readStripeEnv();
  const signingSecret = currentSigningSecret();
  if (!env || !signingSecret) {
    return fail("not_configured", 503);
  }

  let sessionId: unknown;
  try {
    sessionId = (await req.json())?.sessionId;
  } catch {
    return fail("invalid_body", 400);
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return fail("missing_session_id", 400);
  }
  if (!sessionId.startsWith("cs_") || sessionId.length > 200) {
    return fail("invalid_session_id", 400);
  }

  const stripe = getStripe(env);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "subscription"],
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      // Covers invented session IDs and test/live mode mismatches: Stripe
      // scopes lookups to the API key's mode, so a live-mode ID queried
      // with a test-mode key (or vice versa) surfaces as "no such session."
      return fail("invalid_session_id", 400);
    }
    console.error("checkout activate: session retrieve failed");
    return fail("stripe_unavailable", 502);
  }

  if (session.status !== "complete") {
    return fail("session_not_complete", 400);
  }

  const priceId = session.line_items?.data?.[0]?.price?.id ?? null;
  let role: "premium" | "lifetime";
  if (priceId && priceId === env.monthlyPriceId) {
    role = "premium";
  } else if (priceId && priceId === env.lifetimePriceId) {
    role = "lifetime";
  } else {
    return fail("unsupported_product", 400);
  }

  if (role === "premium") {
    if (session.mode !== "subscription") return fail("unsupported_product", 400);
    const sub = session.subscription;
    if (!sub || typeof sub === "string") return fail("invalid_subscription", 400);
    if (sub.status !== "trialing" && sub.status !== "active") {
      return fail("invalid_subscription", 400);
    }

    const payload = {
      role: "premium" as const,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + PREMIUM_EXPIRY_MS).toISOString(),
      subscriptionId: sub.id,
    };
    const token = signStripeLicense(payload, signingSecret);
    return NextResponse.json({
      ok: true,
      role: payload.role,
      expiresAt: payload.expiresAt,
      token,
      // Real Stripe trial end, shown on the success screen so the first
      // charge date is stated exactly rather than recomputed client-side.
      // Absent when the trial has already elapsed (sub.status === "active").
      trialEnd: sub.status === "trialing" && sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    });
  }

  // lifetime
  if (session.mode !== "payment") return fail("unsupported_product", 400);
  if (session.payment_status !== "paid") return fail("incomplete_payment", 400);

  const payload = {
    role: "lifetime" as const,
    issuedAt: new Date().toISOString(),
    expiresAt: null, // current non-expiring lifetime behavior
  };
  const token = signStripeLicense(payload, signingSecret);
  return NextResponse.json({
    ok: true,
    role: payload.role,
    expiresAt: payload.expiresAt,
    token,
  });
}
