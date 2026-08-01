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
}

/** Any status without a specific case here (canceled, unpaid, incomplete,
 *  incomplete_expired, paused, or unrecognized) intentionally returns
 *  null: a calm plan name with no second line beats a fabricated or
 *  possibly-wrong renewal date. */
export function subscriptionDetailLabel(sub: SubscriptionBillingState | null): string | null {
  if (!sub) return null;
  // Stripe's trial_end/current_period_end are exact instants (Unix
  // timestamps), not calendar dates. Formatting without an explicit
  // timeZone resolves the day using the viewer's local offset, which can
  // land on a different calendar day than Stripe's own UTC-based billing
  // surfaces for the same instant — the day must be read in UTC so this
  // never drifts by a day depending on who's looking at it.
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
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
