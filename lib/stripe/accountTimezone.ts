import Stripe from "stripe";

// Stripe's customer-facing date rendering (e.g. renewal-reminder emails,
// and by the same documented convention, the Billing Portal) falls back in
// this order: the customer's own timezone, then the timezone configured in
// the merchant's Stripe account settings, then UTC only as a last resort.
// Daily Proof has no reliable signal for "the customer's timezone" server
// side, so the account's configured timezone — fetched from Stripe itself,
// never guessed — is the closest match to what the Billing Portal shows.
// See node_modules/stripe's Accounts.d.ts: Account.settings.dashboard.timezone.

let cached: { timezone: string | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — a business's Dashboard timezone essentially never changes

/** The IANA timezone string configured in the Stripe Dashboard for this
 *  account, or null if Stripe has none on record (format callers should
 *  treat null as "use UTC"). Cached in memory since this rarely changes and
 *  every subscription-status request would otherwise cost an extra Stripe
 *  API call. A failed fetch falls back to the last known good value rather
 *  than failing the request it's supporting. */
export async function getAccountTimezone(stripe: Stripe): Promise<string | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.timezone;
  }
  try {
    const account = await stripe.accounts.retrieveCurrent();
    const timezone = account.settings?.dashboard?.timezone ?? null;
    cached = { timezone, fetchedAt: Date.now() };
    return timezone;
  } catch {
    return cached?.timezone ?? null;
  }
}
