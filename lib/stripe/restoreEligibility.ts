// Shared Stripe eligibility check for restore-access: what counts as "a
// purchase worth restoring" is decided in exactly one place, so the request
// step (decides whether to email a link) and the confirm step (decides
// which role to issue) can never disagree.

import Stripe from "stripe";
import { StripeEnv } from "@/lib/stripe/server";

export interface EligibleCustomer {
  customerId: string;
  role: "premium" | "lifetime";
  /** Present only for premium — needed to build a renewable license. */
  subscriptionId?: string;
}

/** Checks one known Stripe customer id for an active/trialing monthly
 *  subscription or a paid lifetime purchase. Canceled, refunded, unpaid,
 *  incomplete, and past_due are all "not eligible" here — restore never
 *  infers a grace period, same policy as /api/access/refresh. */
export async function findEligibleCustomerById(
  stripe: Stripe,
  env: StripeEnv,
  customerId: string
): Promise<EligibleCustomer | null> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
  const sub = subs.data.find(
    (s) =>
      (s.status === "active" || s.status === "trialing") &&
      s.items.data.some((i) => i.price.id === env.monthlyPriceId)
  );
  if (sub) return { customerId, role: "premium", subscriptionId: sub.id };

  // Lifetime is a one-time payment, not a subscription — the same
  // `metadata.plan` written at checkout creation (lib/stripe/checkout.ts)
  // is the signal, avoiding a second, separate way of identifying it.
  const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 20 });
  const paidLifetime = sessions.data.some((s) => s.payment_status === "paid" && s.metadata?.plan === "lifetime");
  if (paidLifetime) return { customerId, role: "lifetime" };

  return null;
}

/** Looks up every Stripe customer matching an email and returns the first
 *  eligible one. A person can end up with more than one customer record
 *  (e.g. checked out twice); this treats them as one identity for restore
 *  purposes. */
export async function findEligibleCustomerByEmail(
  stripe: Stripe,
  env: StripeEnv,
  email: string
): Promise<EligibleCustomer | null> {
  const customers = await stripe.customers.list({ email, limit: 5 });
  for (const customer of customers.data) {
    const found = await findEligibleCustomerById(stripe, env, customer.id);
    if (found) return found;
  }
  return null;
}
