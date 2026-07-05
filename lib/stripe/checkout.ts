// Shared Checkout session creation used by /api/checkout (legacy) and the
// named routes /api/stripe/checkout and /api/stripe/lifetime.

import { NextResponse } from "next/server";
import { getStripe, priceIdForPlan, readStripeEnv, type Plan } from "@/lib/stripe/server";

export async function createCheckoutResponse(plan: Plan): Promise<NextResponse> {
  const env = readStripeEnv();
  if (!env) {
    return NextResponse.json(
      { error: "payments_not_configured", message: "Payments are not configured yet." },
      { status: 503 }
    );
  }
  try {
    const stripe = getStripe(env);
    const session = await stripe.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price: priceIdForPlan(env, plan), quantity: 1 }],
      // Card collected up front; billing starts automatically after 3 days.
      ...(plan === "monthly" ? { subscription_data: { trial_period_days: 3 } } : {}),
      success_url: `${env.appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/upgrade?canceled=1`,
      metadata: { plan },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
