import { createCheckoutResponse } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/** POST /api/stripe/lifetime — one-time Founding Member Lifetime purchase. */
export async function POST() {
  return createCheckoutResponse("lifetime");
}
