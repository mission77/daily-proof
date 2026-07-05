import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** POST /api/stripe/webhook
 *  Signature-verified webhook. Today (local-first, no accounts) the events
 *  are validated and acknowledged; when server-side entitlements land, the
 *  handlers below become the single place purchases are recorded. */
export async function POST(req: NextRequest) {
  const env = readStripeEnv();
  if (!env || !env.webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await req.text(); // raw body required for verification
  let event;
  try {
    event = getStripe(env).webhooks.constructEvent(payload, signature, env.webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Future: record entitlement (customer -> lifetime/premium) server-side.
      console.log("checkout.session.completed", event.data.object.id);
      break;
    case "customer.subscription.deleted":
    case "customer.subscription.updated":
      // Future: sync premium status when subscriptions change.
      console.log(event.type, event.data.object.id);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
