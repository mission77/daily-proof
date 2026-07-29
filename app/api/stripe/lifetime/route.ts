import { NextRequest } from "next/server";
import { createCheckoutResponse } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

/** POST /api/stripe/lifetime — one-time Founding Member Lifetime purchase. */
export async function POST(req: NextRequest) {
  return createCheckoutResponse("lifetime", req);
}
