// Server-only Stripe access. Never import from client components.
// Secrets stay in process.env; nothing here reaches the browser bundle.

import Stripe from "stripe";

export type Plan = "monthly" | "lifetime";

export interface StripeEnv {
  secretKey: string;
  monthlyPriceId: string;
  lifetimePriceId: string;
  webhookSecret: string | null; // only required by the webhook route
  appUrl: string;
}

/** Reads Stripe env vars. Returns null when payments are not configured —
 *  the app must keep working (and never crash) without keys. */
export function readStripeEnv(): StripeEnv | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
  const lifetimePriceId = process.env.STRIPE_LIFETIME_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secretKey || !monthlyPriceId || !lifetimePriceId || !appUrl) return null;
  return {
    secretKey,
    monthlyPriceId,
    lifetimePriceId,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
    appUrl: appUrl.replace(/\/$/, ""),
  };
}

export function stripeConfigured(): boolean {
  return readStripeEnv() !== null;
}

let client: Stripe | null = null;

/** Lazy client so builds and non-payment routes never touch Stripe. */
export function getStripe(env: StripeEnv): Stripe {
  if (!client) client = new Stripe(env.secretKey);
  return client;
}

export function priceIdForPlan(env: StripeEnv, plan: Plan): string {
  return plan === "monthly" ? env.monthlyPriceId : env.lifetimePriceId;
}
