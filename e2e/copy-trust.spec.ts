import { test, expect } from "@playwright/test";

// Copy/trust smoke checks: catches contradictory or drifted claims (trial
// terms, support address, backup honesty) without re-litigating wording the
// Founder Review already approved. This environment runs with
// NEXT_PUBLIC_BETA_MODE unset (defaults to beta-on, see lib/site.ts), so
// pricing shows the Founding Beta screen rather than live checkout — the
// $7/month · 3-day-trial claim is instead verified on the marketing pages
// that state it unconditionally (pricing metadata, terms, refunds).

test("support email is real and consistent on Contact and Support pages", async ({ page }) => {
  await page.goto("/contact");
  const contactLink = page.getByRole("link", { name: "dailyproofhq@gmail.com" });
  await expect(contactLink).toBeVisible();
  await expect(contactLink).toHaveAttribute("href", "mailto:dailyproofhq@gmail.com");

  await page.goto("/support");
  const supportLink = page.getByRole("link", { name: "dailyproofhq@gmail.com" });
  await expect(supportLink).toBeVisible();
  await expect(supportLink).toHaveAttribute("href", "mailto:dailyproofhq@gmail.com");
});

test("trial terms are stated consistently on Terms and Refunds", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText(/3-day free trial/)).toBeVisible();

  await page.goto("/refunds");
  await expect(page.getByText("dailyproofhq@gmail.com")).toBeVisible();
});

test("pricing page never claims checkout is live while in beta mode", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Founding Beta" })).toBeVisible();
  // No "$7/month" checkout CTA should render while beta-gated — that copy
  // only belongs to the live PlanPicker.
  await expect(page.getByRole("button", { name: "Start 3-day trial" })).not.toBeVisible();
});

test("Settings backup copy is honest: no cloud backup, eviction risk stated, import purpose stated", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByText(/there is no cloud backup, on\s+any plan/)).toBeVisible();
  await expect(page.getByText(/without a recent export/)).toBeVisible();
  await expect(page.getByText(/Import brings a backup onto a new device/)).toBeVisible();
});

test("Settings privacy copy states proof never leaves the device", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText("Your proof never leaves this device.")).toBeVisible();
});
