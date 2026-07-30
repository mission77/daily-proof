import { test, expect } from "@playwright/test";
import { seedAccess } from "./helpers";

// Settings must never promise subscription management it can't deliver.
// canManageBilling gates on role === "premium" with a Stripe-derived
// license token — this seeds exactly that state to verify the UI wiring
// without needing a live Stripe key.

test("Settings shows Manage subscription for a Stripe-derived Premium license", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page, "premium", { token: "test-token", expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  await page.goto("/settings");

  const manageButton = page.getByRole("button", { name: "Manage subscription" });
  await expect(manageButton).toBeVisible();
  await expect(
    page.getByText(/cancel your subscription, update your payment method, or view billing history/)
  ).toBeVisible();

  // No live Stripe key in this environment, so the portal call correctly
  // fails closed rather than crashing — this is the same "not_configured"
  // behavior verified elsewhere for the Stripe-backed endpoints.
  await manageButton.click();
  await expect(page.getByText("Billing portal isn't available right now")).toBeVisible();
});

test("Settings does not offer subscription management for roles with nothing to manage", async ({ page }) => {
  for (const role of ["owner", "lifetime", "free"]) {
    await page.goto("/");
    await seedAccess(page, role);
    await page.goto("/settings");
    await expect(page.getByRole("button", { name: "Manage subscription" })).toHaveCount(0);
  }
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
