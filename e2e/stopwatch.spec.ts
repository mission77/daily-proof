import { test, expect } from "@playwright/test";
import { seedAccess, seedPractice } from "./helpers";

// Regression coverage: Timer was added alongside Stopwatch without touching
// its behavior. These checks fail loudly if that ever stops being true.

test("Stopwatch: start, pause, resume, finish, save proof, appears in Book", async ({ page }) => {
  // Seed from "/" (marketing, outside AccessGuard) rather than "/studio":
  // AccessGuard writes a default "free" AccessState the first time it reads
  // one that doesn't exist yet, and that mount-time write can race with (and
  // clobber) a seed written after navigating straight to a guarded route.
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Deep Work" });
  await page.goto("/studio");

  await expect(page.getByText("Deep Work")).toBeVisible();
  // Default mode is Stopwatch (no prior mode saved) — Start Session works
  // with no duration setup required.
  await page.getByRole("button", { name: "Start session" }).click();

  await expect(page).toHaveURL("/focus");
  await expect(page.getByRole("timer", { name: /Elapsed time/ })).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Paused")).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByText("Paused")).not.toBeVisible();

  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByText("Completed what you intended?")).toBeVisible();
  await page.getByRole("button", { name: "Save proof" }).click();

  await expect(page.getByText("Proof saved.")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page).toHaveURL("/book");
  await expect(page.getByText("Deep Work")).toBeVisible();
  await expect(page.getByText("Completed")).toBeVisible();
  // Stopwatch proof never shows a "Planned" segment — that's Timer-only.
  await expect(page.getByText(/Planned/)).not.toBeVisible();
});

test("Stopwatch: cancel discards the session", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Reading" });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page).toHaveURL("/focus");

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cancel this session?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel session" }).click();

  await expect(page).toHaveURL("/studio");
});
