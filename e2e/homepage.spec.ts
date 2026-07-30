import { test, expect } from "@playwright/test";

// The launched public homepage: no beta language anywhere, correct CTAs,
// real pricing, no broken assets, no console errors, responsive.

test("homepage has no beta language and correct primary CTA", async ({ page }) => {
  await page.goto("/");
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/founding beta|request early access|coming soon|waitlist|invited members/i);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Collect proof that meaningful work happened"
  );
  const primaryCta = page.getByRole("link", { name: "Open Daily Proof" }).first();
  await expect(primaryCta).toBeVisible();
  await expect(primaryCta).toHaveAttribute("href", "/studio");
});

test("every promised section is present and in order", async ({ page }) => {
  await page.goto("/");
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headings).toEqual([
    "Why it exists",
    "How it works",
    "Proof, not performance",
    "A fact, not a promise",
    "Your proof, made real",
    "Pricing",
    "Questions, answered",
  ]);
});

test("pricing section shows real, current terms via the live PlanPicker", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Pricing" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("$7", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("$70", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Start 3-day trial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy lifetime" })).toBeVisible();
});

test("FAQ answers the real launch questions, not beta operations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Questions, answered" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("How does the trial and billing work?")).toBeVisible();
  await expect(page.getByText("What happens to my proof if I lose access or switch devices?")).toBeVisible();
  await page.getByText("How does the trial and billing work?").click();
  await expect(page.getByText(/canceling during those 3 days costs nothing/)).toBeVisible();
});

test("no broken images and no console errors on the homepage", async ({ page }) => {
  const errors: string[] = [];
  const brokenImages: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("response", (res) => {
    if (res.request().resourceType() === "image" && res.status() >= 400) {
      brokenImages.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 800) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(150);
  }

  expect(brokenImages).toEqual([]);
  expect(errors).toEqual([]);
});

test("real, generated share card image is present and loads", async ({ page }) => {
  await page.goto("/");
  const shareCard = page.getByAltText("A real Daily Proof share card, generated from an actual session");
  await shareCard.scrollIntoViewIfNeeded();
  await expect(shareCard).toBeVisible();
  const naturalWidth = await shareCard.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
});

test("no horizontal overflow at mobile, tablet, or desktop widths", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  }
});

test("mobile menu opens and its CTA matches the hero CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNav.getByRole("link", { name: "Open Daily Proof" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Request Early Access" })).toHaveCount(0);
});

test("AccessGuard lock screen reflects launch state, not beta", async ({ page }) => {
  // A fresh browser context (no seeded access) hitting a guarded route
  // directly must never claim the app is still invite-only.
  await page.goto("/studio");
  await expect(page.getByText("Unlock Daily Proof on this device.")).toBeVisible();
  await expect(page.getByText(/private beta|invited members/i)).toHaveCount(0);
});
