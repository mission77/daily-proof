import { NextRequest, NextResponse } from "next/server";
import { readStripeEnv } from "@/lib/stripe/server";
import { createCheckoutResponse } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/** POST /api/stripe/checkout — monthly subscription with a 3-day trial. */
export async function POST(req: NextRequest) {
  return createCheckoutResponse("monthly", req);
}

export async function GET() {
  return NextResponse.json({ configured: readStripeEnv() !== null });
}
