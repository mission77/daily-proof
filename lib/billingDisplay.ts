// Settings' "Current plan" secondary line for a Stripe-derived Monthly
// subscription — built entirely from live Stripe billing state fetched via
// /api/access/subscription, never from the local license's rolling
// expiresAt (see lib/license/stripeLicense.ts / the refresh routes: that
// value is a 7-day offline-tolerance cache, not a billing date, and must
// never be labeled as one).

export interface SubscriptionBillingState {
  status: string;
  trialEnd: string | null; // ISO
  currentPeriodEnd: string | null; // ISO
  cancelAtPeriodEnd: boolean;
  /** IANA timezone string from the Stripe account's Dashboard settings
   *  (see lib/stripe/accountTimezone.ts), or null. Stripe's own
   *  customer-facing date rendering falls back account-timezone → UTC —
   *  never plain UTC by default — so this must be honored the same way
   *  here, or the displayed day can differ from the Billing Portal's. */
  timezone: string | null;
}

/** Any status without a specific case here (canceled, unpaid, incomplete,
 *  incomplete_expired, paused, or unrecognized) intentionally returns
 *  null: a calm plan name with no second line beats a fabricated or
 *  possibly-wrong renewal date. */
export function subscriptionDetailLabel(sub: SubscriptionBillingState | null): string | null {
  if (!sub) return null;
  // Stripe's trial_end/current_period_end are exact instants (Unix
  // timestamps), not calendar dates. Reading the calendar day in the
  // viewer's own browser timezone — or in a hardcoded "UTC" guess — can
  // both land on a different day than Stripe's Billing Portal, which
  // renders in the Stripe *account's* configured timezone, UTC only when
  // Stripe has no account timezone on record.
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { timeZone: sub.timezone ?? "UTC" });
  switch (sub.status) {
    case "trialing":
      return sub.trialEnd ? `First charge ${fmt(sub.trialEnd)}` : null;
    case "active":
      if (!sub.currentPeriodEnd) return null;
      return sub.cancelAtPeriodEnd
        ? `Access until ${fmt(sub.currentPeriodEnd)}`
        : `Renews ${fmt(sub.currentPeriodEnd)}`;
    case "past_due":
      return "Payment needs attention";
    default:
      return null;
  }
}
