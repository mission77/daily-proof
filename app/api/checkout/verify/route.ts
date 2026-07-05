import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";

export const runtime = "nodejs";

/** GET /api/checkout/verify?session_id=cs_...
 *  Confirms payment status server-side (never trust the redirect alone).
 *  The client uses the result to unlock the local access role; when accounts
 *  arrive, entitlements move fully server-side and this stays the source of truth. */
export async function GET(req: NextRequest) {
  const env = readStripeEnv();
  if (!env) {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 503 });
  }

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "invalid_session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe(env);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const plan = session.metadata?.plan === "lifetime" ? "lifetime" : "monthly";
    const paid =
      session.status === "complete" &&
      (session.payment_status === "paid" ||
        // Subscriptions with a trial start unpaid but active.
        session.payment_status === "no_payment_required");
    return NextResponse.json({ paid, plan });
  } catch (err) {
    console.error("Stripe verify error:", err);
    return NextResponse.json({ error: "verify_failed" }, { status: 502 });
  }
}
