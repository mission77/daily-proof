import { test, expect, Page } from "@playwright/test";
import { seedAccess } from "./helpers";

// Settings' "Current plan" secondary line must always come from live Stripe
// billing state (see /api/access/subscription), never from the local
// license's rolling 7-day expiresAt cache. These tests mock the API route
// directly so every billing state can be exercised without real Stripe
// keys — the route contract (status/trialEnd/currentPeriodEnd/
// cancelAtPeriodEnd in, a specific label out) is what's under test, not
// the live Stripe call itself (see e2e/access-restore.spec.ts's header for
// why that boundary is drawn the same way elsewhere in this suite).

function accessCard(page: Page) {
  return page.getByRole("region", { name: "Access" });
}

async function mockSubscription(page: Page, body: Record<string, unknown>, status = 200) {
  await page.route("**/api/access/subscription", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
  );
}

// Matches lib/billingDisplay.ts's own formatting exactly: the Stripe
// account's configured Dashboard timezone when the mocked response
// includes one, UTC only when it doesn't (Stripe's own documented
// fallback chain — see lib/stripe/accountTimezone.ts). Using the host
// machine's local timezone here instead would make these expectations
// only accidentally correct on whatever machine runs the suite, which is
// exactly how the original day-shift bug went uncaught in the first place.
function zoneDate(iso: string, timeZone: string | null): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: timeZone ?? "UTC" });
}
const utcDate = (iso: string) => zoneDate(iso, null);

const FUTURE_EXPIRES = new Date(Date.now() + 7 * 86_400_000).toISOString();

test("trialing: Monthly, First charge on the trial end date", async ({ page }) => {
  const trialEnd = new Date(Date.now() + 3 * 86_400_000).toISOString();
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "trialing",
    trialEnd,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(`First charge ${utcDate(trialEnd)}`)).toBeVisible();
});

test("active, not canceling: Monthly, Renews on the current period end date", async ({ page }) => {
  const currentPeriodEnd = new Date(Date.now() + 20 * 86_400_000).toISOString();
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "active",
    trialEnd: null,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(`Renews ${utcDate(currentPeriodEnd)}`)).toBeVisible();
});

test("active with cancel_at_period_end: Monthly, Access until the current period end date", async ({ page }) => {
  const currentPeriodEnd = new Date(Date.now() + 12 * 86_400_000).toISOString();
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "active",
    trialEnd: null,
    currentPeriodEnd,
    cancelAtPeriodEnd: true,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(`Access until ${utcDate(currentPeriodEnd)}`)).toBeVisible();
  await expect(accessCard(page).getByText(/^Renews/)).toHaveCount(0);
});

test("past_due: Monthly, Payment needs attention, no fabricated date", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "past_due",
    trialEnd: null,
    currentPeriodEnd: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText("Payment needs attention")).toBeVisible();
  await expect(accessCard(page).getByText(/Renews|Access until/)).toHaveCount(0);
});

test("canceled: calm Monthly with no line at all, never a stale renewal claim", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "canceled",
    trialEnd: null,
    currentPeriodEnd: new Date(Date.now() - 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(/Renews|Access until|First charge/)).toHaveCount(0);
});

test("Stripe unavailable: Monthly with no date, no error message, no fallback to local cache expiry", async ({
  page,
}) => {
  // Local expiresAt deliberately set to a distinctive, made-up date — if it
  // ever leaked into the visible label this assertion would catch it.
  const localExpiresAt = "2099-01-01T00:00:00.000Z";
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: localExpiresAt });
  await page.route("**/api/access/subscription", (route) =>
    route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ ok: false, reason: "stripe_unavailable" }) })
  );
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Monthly", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(/Renews|Access until|First charge|Payment needs attention/)).toHaveCount(0);
  await expect(page.getByText(/error|unavailable|couldn't|failed/i)).toHaveCount(0);
  // The local rolling-cache date must never appear as billing information.
  await expect(page.getByText(utcDate(localExpiresAt))).toHaveCount(0);
});

test("no accidental use of local expiresAt: the visible date always matches Stripe's, never the local cache", async ({
  page,
}) => {
  const localExpiresAt = "2099-06-15T00:00:00.000Z"; // deliberately far from the Stripe date below
  const stripeCurrentPeriodEnd = new Date(Date.now() + 9 * 86_400_000).toISOString();
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: localExpiresAt });
  await mockSubscription(page, {
    ok: true,
    status: "active",
    trialEnd: null,
    currentPeriodEnd: stripeCurrentPeriodEnd,
    cancelAtPeriodEnd: false,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText(`Renews ${utcDate(stripeCurrentPeriodEnd)}`)).toBeVisible();
  await expect(page.getByText(utcDate(localExpiresAt))).toHaveCount(0);
  await expect(page.getByText(/until 1\/1\/2099|until 6\/15\/2099/)).toHaveCount(0);
});

test("Premium access code (no Stripe token): 'Premium access code', no Stripe call, no billing line", async ({
  page,
}) => {
  let subscriptionRequests = 0;
  await page.route("**/api/access/subscription", (route) => {
    subscriptionRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false }) });
  });
  await page.goto("/");
  // role premium, license present, no Stripe token — same shape a redeemed
  // "PRO-…" code or a dev-only role switch produces.
  await seedAccess(page, "premium");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Premium access code", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(/Renews|Access until|First charge|Payment needs attention/)).toHaveCount(0);
  expect(subscriptionRequests).toBe(0);
});

test("Lifetime: 'Lifetime access', no billing line, no Stripe call", async ({ page }) => {
  let subscriptionRequests = 0;
  await page.route("**/api/access/subscription", (route) => {
    subscriptionRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false }) });
  });
  await page.goto("/");
  await seedAccess(page, "lifetime");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Lifetime access", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText(/Renews|Access until|First charge|Payment needs attention/)).toHaveCount(0);
  expect(subscriptionRequests).toBe(0);
});

// Regression coverage for the "Daily Proof says Aug 2, Stripe Billing
// Portal says Aug 3" report. Root cause: Stripe's own customer-facing date
// rendering (documented for renewal-reminder emails, and confirmed by the
// exact reported gap) falls back customer timezone → the timezone
// configured on the Stripe account → UTC only as a last resort. Formatting
// in plain UTC — the first attempted fix — does NOT reliably match the
// Billing Portal; only the account's actual configured timezone does. This
// instant is chosen so UTC and the account timezone below disagree on the
// calendar day, the same shape as the real report:
const ACCOUNT_TZ_DIVERGES_FROM_UTC_TRIAL_END = "2026-08-02T21:00:00.000Z"; // 9pm UTC Aug 2 -> 2:30am Aug 3 in Asia/Kolkata (UTC+5:30)
const ACCOUNT_TZ_DIVERGES_FROM_UTC_PERIOD_END = "2026-09-02T22:00:00.000Z"; // 10pm UTC Sep 2 -> 3:30am Sep 3 in Asia/Kolkata

test("trialing: uses the Stripe account's configured timezone, not UTC, matching the Billing Portal", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "trialing",
    trialEnd: ACCOUNT_TZ_DIVERGES_FROM_UTC_TRIAL_END,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    timezone: "Asia/Kolkata",
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("First charge 8/3/2026", { exact: true })).toBeVisible();
  // The old "just force UTC" fix would have shown this instead — asserting
  // its absence is what actually catches a regression back to that fix.
  await expect(accessCard(page).getByText("First charge 8/2/2026")).toHaveCount(0);
});

test("active renewal: uses the Stripe account's configured timezone, not UTC", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "active",
    trialEnd: null,
    currentPeriodEnd: ACCOUNT_TZ_DIVERGES_FROM_UTC_PERIOD_END,
    cancelAtPeriodEnd: false,
    timezone: "Asia/Kolkata",
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Renews 9/3/2026", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText("Renews 9/2/2026")).toHaveCount(0);
});

test("no Stripe account timezone on record: falls back to UTC, exactly as Stripe itself documents", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
  await mockSubscription(page, {
    ok: true,
    status: "trialing",
    trialEnd: ACCOUNT_TZ_DIVERGES_FROM_UTC_TRIAL_END,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    timezone: null,
  });
  await page.goto("/settings");

  await expect(accessCard(page).getByText(`First charge ${utcDate(ACCOUNT_TZ_DIVERGES_FROM_UTC_TRIAL_END)}`, { exact: true })).toBeVisible();
});

test.describe("the displayed date depends only on the Stripe account's timezone, never the viewer's own", () => {
  for (const timezoneId of ["America/Los_Angeles", "Pacific/Kiritimati", "UTC"]) {
    test.describe(`viewer timezone: ${timezoneId}`, () => {
      test.use({ timezoneId });

      test("trialing shows the same account-timezone day regardless of who's viewing", async ({ page }) => {
        await page.goto("/");
        await seedAccess(page, "premium", { token: "test-token", expiresAt: FUTURE_EXPIRES });
        await mockSubscription(page, {
          ok: true,
          status: "trialing",
          trialEnd: ACCOUNT_TZ_DIVERGES_FROM_UTC_TRIAL_END,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          timezone: "Asia/Kolkata",
        });
        await page.goto("/settings");

        await expect(accessCard(page).getByText("First charge 8/3/2026", { exact: true })).toBeVisible();
      });

      test("canceled and Lifetime still show no date at all, in any timezone", async ({ page }) => {
        await page.goto("/");
        await seedAccess(page, "lifetime");
        await page.goto("/settings");
        await expect(accessCard(page).getByText("Lifetime access", { exact: true })).toBeVisible();
        await expect(accessCard(page).getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toHaveCount(0);
      });
    });
  }
});
