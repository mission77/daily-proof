import { NextResponse } from "next/server";
import { readStripeEnv } from "@/lib/stripe/server";
import { createCheckoutResponse } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/** POST /api/stripe/checkout — monthly subscription with a 3-day trial. */
export async function POST() {
  return createCheckoutResponse("monthly");
}

export async function GET() {
  return NextResponse.json({ configured: readStripeEnv() !== null });
}
