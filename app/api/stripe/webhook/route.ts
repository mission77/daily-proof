import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { storeConfigured, upsertStripeLicense } from "@/lib/license/store";

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

  const sync = storeConfigured();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customer = typeof session.customer === "string" ? session.customer : null;
        const role = session.metadata?.plan === "lifetime" ? "lifetime" : "premium";
        if (sync && customer) await upsertStripeLicense(customer, role, "active");
        console.log("checkout.session.completed", session.id, role);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customer = typeof sub.customer === "string" ? sub.customer : null;
        const status =
          sub.status === "active" || sub.status === "trialing"
            ? "active"
            : sub.status === "past_due"
              ? "past_due"
              : "canceled";
        if (sync && customer) await upsertStripeLicense(customer, "premium", status);
        console.log("customer.subscription.updated", sub.id, status);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customer = typeof sub.customer === "string" ? sub.customer : null;
        if (sync && customer) await upsertStripeLicense(customer, "premium", "canceled");
        console.log("customer.subscription.deleted", sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customer = typeof invoice.customer === "string" ? invoice.customer : null;
        if (sync && customer) await upsertStripeLicense(customer, "premium", "past_due");
        console.log("invoice.payment_failed", invoice.id);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // License-store trouble must not make Stripe retry forever on our behalf
    // for events we did receive and verify.
    console.error("webhook sync error:", err);
  }

  return NextResponse.json({ received: true });
}
