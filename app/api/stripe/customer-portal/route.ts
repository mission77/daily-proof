import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** POST /api/stripe/customer-portal { customerId }
 *  Opens Stripe's Billing Portal for subscription management, cancellation,
 *  and payment-method updates. The customer id was returned by a verified
 *  checkout and stored locally — no accounts involved. */
export async function POST(req: NextRequest) {
  const env = readStripeEnv();
  if (!env) {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  }

  let customerId: unknown;
  try {
    customerId = (await req.json())?.customerId;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
    return NextResponse.json({ error: "invalid_customer" }, { status: 400 });
  }

  try {
    const stripe = getStripe(env);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${env.appUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: "portal_failed" }, { status: 502 });
  }
}
