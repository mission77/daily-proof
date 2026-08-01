import { test, expect } from "@playwright/test";

// The launched public homepage: no beta language anywhere, correct CTAs,
// real pricing, no broken assets, no console errors, responsive. Also
// covers the split journey: a new visitor buying a plan vs. an existing
// customer opening the app they already have.

const STALE_BETA_LANGUAGE =
  /founding beta|request early access|early access|coming soon|waitlist|invited members|private beta/i;

test("homepage has no beta language anywhere", async ({ page }) => {
  await page.goto("/");
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(STALE_BETA_LANGUAGE);
});

test("header and mobile menu show the returning-customer action, not a purchase CTA", async ({ page }) => {
  await page.goto("/");
  const headerCta = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Open the app" });
  await expect(headerCta).toBeVisible();
  await expect(headerCta).toHaveAttribute("href", "/studio");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  await expect(mobileNav.getByRole("link", { name: "Open the app" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: /request early access/i })).toHaveCount(0);
});

test("hero distinguishes a new visitor's path from an existing customer's", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Collect proof that meaningful work happened"
  );

  // New visitor: primary CTA leads to the pricing section on this page, not
  // straight into the app before a plan has been chosen.
  const primaryCta = page.getByRole("link", { name: "Get Daily Proof" });
  await expect(primaryCta).toBeVisible();
  await expect(primaryCta).toHaveAttribute("href", "#pricing");

  await expect(page.getByRole("link", { name: "See how it works" })).toHaveAttribute("href", "#how");

  // Existing customer: a small, clearly secondary link right under the
  // purchase CTAs, so the distinction is obvious without reading the header.
  const existingCustomerLink = page.getByRole("link", { name: "Open the app" }).last();
  await expect(existingCustomerLink).toBeVisible();
  await expect(existingCustomerLink).toHaveAttribute("href", "/studio");
});

test("new-visitor journey: hero CTA reaches a real, live pricing section", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get Daily Proof" }).click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Start 3-day trial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buy lifetime" })).toBeVisible();
});

test("existing-customer journey: header CTA reaches /studio, which offers unlock, plan, and restore-access", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Open the app" }).click();
  await expect(page).toHaveURL("/studio");
  // No stored access in a fresh context — Studio itself decides what to
  // show, and it must never claim the product is still invite-only.
  await expect(page.getByText("Unlock Daily Proof on this device.")).toBeVisible();
  await expect(page.getByText(/private beta|invited members/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start 3-day trial" })).toBeVisible();
  await expect(page.getByText(/Restore access/)).toBeVisible();
});

test("every promised section is present and in order", async ({ page }) => {
  await page.goto("/");
  const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headings).toEqual([
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

test("all four How It Works screenshots load, at a size large enough to read", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const alts = [
    "Choosing today's focus in Daily Proof Studio",
    "A Timer session counting down in Daily Proof Focus mode",
    "Reflecting on a finished session in Daily Proof",
    "A day of saved proof in the Daily Proof Book",
  ];
  for (const alt of alts) {
    const img = page.getByAltText(alt);
    await img.scrollIntoViewIfNeeded();
    await expect(img).toBeVisible();
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    const renderedWidth = await img.evaluate((el: HTMLImageElement) => el.getBoundingClientRect().width);
    expect(naturalWidth).toBeGreaterThan(0);
    // These are meant to be read, not glanced at as thumbnails.
    expect(renderedWidth).toBeGreaterThan(400);
  }
});

test("real, generated share card image is present and loads", async ({ page }) => {
  await page.goto("/");
  const shareCard = page.getByAltText("A real Daily Proof share card, generated from an actual session");
  await shareCard.scrollIntoViewIfNeeded();
  await expect(shareCard).toBeVisible();
  const naturalWidth = await shareCard.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(naturalWidth).toBeGreaterThan(0);
});

test("no horizontal overflow at 390, 768, 1280, or 1440 widths", async ({ page }) => {
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  }
});

test("AccessGuard lock screen reflects launch state, not beta", async ({ page }) => {
  // A fresh browser context (no seeded access) hitting a guarded route
  // directly must never claim the app is still invite-only.
  await page.goto("/studio");
  await expect(page.getByText("Unlock Daily Proof on this device.")).toBeVisible();
  await expect(page.getByText(STALE_BETA_LANGUAGE)).toHaveCount(0);
});

test("privacy and pricing pages carry no unconditional beta or future-tense claims", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText(/During beta/i)).toHaveCount(0);
  await expect(page.getByText(/if you purchase a plan in the future/i)).toHaveCount(0);

  await page.goto("/pricing");
  await expect(page.getByText(STALE_BETA_LANGUAGE)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start 3-day trial" })).toBeVisible();
});
