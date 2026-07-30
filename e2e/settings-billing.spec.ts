import { test, expect, Page } from "@playwright/test";
import { seedAccess } from "./helpers";

// The About section elsewhere in Settings also shows the raw role tier
// (unchanged, low-stakes, not adjacent to any billing claim) — so "no bare
// 'Premium' text" has to be scoped to the Access card specifically, not the
// whole page, or it would collide with that unrelated label.
function accessCard(page: Page) {
  return page.getByRole("region", { name: "Access" });
}

// Settings' "Current plan" line and the "Manage subscription" button must
// never disagree: the label has to make it obvious *why* the button is or
// isn't there, for every access type the app can produce — a real Stripe
// subscription, a one-time Lifetime purchase, Owner, a manually issued
// access code, Beta, and no plan at all.

test("Monthly Stripe subscriber: Current plan reads Monthly, Manage subscription and Restore access both show", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Current plan")).toBeVisible();
  await expect(accessCard(page).getByText(/^Monthly/)).toBeVisible();
  await expect(accessCard(page).getByText("Premium", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();
  await expect(page.getByText(/Restore access/)).toBeVisible();
});

test("Lifetime customer: Current plan reads Lifetime, no Manage subscription, Restore access still shows", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page, "lifetime");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Lifetime", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
  await expect(page.getByText(/Restore access/)).toBeVisible();
});

test("Owner: Current plan reads Owner, not Premium, no Manage subscription", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "owner");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Owner", { exact: true })).toBeVisible();
  await expect(accessCard(page).getByText("Premium", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
});

test("Manually issued Premium access code: labeled as access-code Premium, not an unexplained Premium with no billing", async ({
  page,
}) => {
  await page.goto("/");
  // Same shape a redeemed "PRO-…" code or a dev-only role switch produces:
  // role premium, license present, no Stripe token behind it.
  await seedAccess(page, "premium");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Premium (access code)")).toBeVisible();
  await expect(accessCard(page).getByText("Premium", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
  await expect(page.getByText(/Restore access/)).toBeVisible();
});

test("Beta: Current plan reads Beta, no Manage subscription", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "beta");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("Beta", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
});

test("Free: Current plan reads No active plan, no Manage subscription", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "free");
  await page.goto("/settings");

  await expect(accessCard(page).getByText("No active plan")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
});

test("Manage subscription opens the billing portal flow (fails closed without live Stripe, never crashes)", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  await page.goto("/settings");

  const manageButton = page.getByRole("button", { name: "Manage subscription" });
  await expect(manageButton).toBeVisible();
  await expect(
    page.getByText(/cancel your subscription, update your payment method, or view billing history/)
  ).toBeVisible();
  await manageButton.click();
  await expect(page.getByText("Billing portal isn't available right now")).toBeVisible();
});

test("access code placeholder uses a neutral production format, not a beta example", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "free");
  await page.goto("/settings");
  const input = page.locator("#s-code");
  await expect(input).toHaveAttribute("placeholder", /^e\.g\. PRO-/);
  await expect(input).not.toHaveAttribute("placeholder", /BETA/);
});

test("AccessGuard lock screen's code input also uses the neutral placeholder", async ({ page }) => {
  // Fresh context, no seeded access — the guarded lock screen itself.
  await page.goto("/studio");
  const input = page.locator("#s-code");
  await expect(input).toHaveAttribute("placeholder", /^e\.g\. PRO-/);
});
