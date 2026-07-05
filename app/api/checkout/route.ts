import { NextRequest, NextResponse } from "next/server";
import { getStripe, priceIdForPlan, readStripeEnv, type Plan } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** GET /api/checkout — lets the client know whether payments are live,
 *  without exposing any secret material. */
export async function GET() {
  return NextResponse.json({ configured: readStripeEnv() !== null });
}

/** POST /api/checkout { plan: "monthly" | "lifetime" }
 *  Creates a real Stripe Checkout session and returns its URL. */
export async function POST(req: NextRequest) {
  const env = readStripeEnv();
  if (!env) {
    return NextResponse.json(
      { error: "payments_not_configured", message: "Payments are not configured yet." },
      { status: 503 }
    );
  }

  let plan: Plan;
  try {
    const body = await req.json();
    plan = body?.plan;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (plan !== "monthly" && plan !== "lifetime") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  try {
    const stripe = getStripe(env);
    const session = await stripe.checkout.sessions.create({
      mode: plan === "monthly" ? "subscription" : "payment",
      line_items: [{ price: priceIdForPlan(env, plan), quantity: 1 }],
      // 3-day free trial on the monthly plan, matching the product copy.
      ...(plan === "monthly" ? { subscription_data: { trial_period_days: 3 } } : {}),
      success_url: `${env.appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/upgrade`,
      metadata: { plan },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }
}
