import { NextRequest, NextResponse } from "next/server";
import { readStripeEnv, type Plan } from "@/lib/stripe/server";
import { createCheckoutResponse } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/** GET /api/checkout — lets the client know whether payments are live,
 *  without exposing any secret material. */
export async function GET() {
  return NextResponse.json({ configured: readStripeEnv() !== null });
}

/** POST /api/checkout { plan: "monthly" | "lifetime" } */
export async function POST(req: NextRequest) {
  let plan: Plan;
  try {
    plan = (await req.json())?.plan;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (plan !== "monthly" && plan !== "lifetime") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  return createCheckoutResponse(plan);
}
