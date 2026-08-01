import { test, expect } from "@playwright/test";
import { seedAccess, seedPractice, readSessions } from "./helpers";

// Manual logging: Daily Proof must not assume every proof started with the
// built-in Timer/Stopwatch. "Log session" has to feel equal to "Start
// session" and produce the exact same kind of proof record.

test("Log session sits alongside Start session with equal visual weight", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Deep Work" });
  await page.goto("/studio");

  const startButton = page.getByRole("button", { name: "Start session" });
  const logButton = page.getByRole("button", { name: "Log session" });
  await expect(startButton).toBeVisible();
  await expect(logButton).toBeVisible();

  await logButton.click();
  await expect(page.getByRole("dialog", { name: "Log a session" })).toBeVisible();
  await expect(page.getByText("For work done with a watch, another timer, or no timer at all.")).toBeVisible();
});

test("Log session: fill and save ends on the same Proof Saved screen as Timer/Stopwatch, then Done reaches the Book", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Reading" });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Log session" }).click();
  await page.locator("#log-duration").fill("45");
  // Date and time defaults to now, so the entry lands on today's Book page
  // without needing to navigate — that default is part of the spec.
  await page.getByRole("radio", { name: "Not quite" }).click();
  await page.locator("#log-notes").fill("Read at the library, no timer running.");
  await page.getByRole("button", { name: "Save proof" }).click();

  // Save Proof -> Proof Saved screen -> Share proof / Done, exactly like the
  // Timer/Stopwatch flow — not a toast that dumps the user back on Studio.
  await expect(page.getByRole("dialog", { name: "Log a session" })).not.toBeVisible();
  await expect(page.getByText("Proof saved.")).toBeVisible();
  await expect(page.getByText("Reading · 45:00")).toBeVisible();
  const shareButton = page.getByRole("button", { name: "Share proof" });
  const doneButton = page.getByRole("button", { name: "Done" });
  await expect(shareButton).toBeVisible();
  await expect(shareButton).toHaveClass(/btn-primary/);
  await expect(doneButton).toHaveClass(/btn-quiet/);

  await doneButton.click();
  await expect(page.getByText("Proof saved.")).not.toBeVisible();
  await expect(page).toHaveURL("/studio");

  await page.goto("/book");
  await expect(page.getByText("Reading")).toBeVisible();
  await expect(page.getByText("45m")).toBeVisible();
  await expect(page.getByText("Ended early")).toBeVisible();
  await expect(page.getByText("Read at the library, no timer running.")).toBeVisible();

  // Same record shape saveProof() produces for Timer/Stopwatch: no mode set,
  // so a manually logged session is indistinguishable from a plain Stopwatch
  // entry anywhere downstream (Book, backup, share cards) — and it carries a
  // snapshotted quote, so it can generate a share card too.
  const sessions = await readSessions(page);
  expect(sessions).toHaveLength(1);
  expect(sessions[0].mode).toBeUndefined();
  expect(sessions[0].durationMs).toBe(45 * 60_000);
  expect(sessions[0].completed).toBe(false);
  expect(sessions[0].quote?.text).toBeTruthy();
});

test("Log session: rejects a missing or invalid duration instead of saving", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Deep Work" });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Log session" }).click();
  await page.getByRole("button", { name: "Save proof" }).click();
  await expect(page.getByText("Enter a number of minutes.")).toBeVisible();

  await page.locator("#log-duration").fill("0");
  await page.getByRole("button", { name: "Save proof" }).click();
  await expect(page.getByText("Duration must be more than zero.")).toBeVisible();

  await expect(page.getByRole("dialog", { name: "Log a session" })).toBeVisible();
  expect(await readSessions(page)).toHaveLength(0);
});

test("Log session: measurement field only shows for practices that track it", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, {
    name: "Distance run",
    evidenceTypes: ["timer", "measurement"],
    measurementUnit: "km",
  });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Log session" }).click();
  await expect(page.locator('label[for="log-measurement"]')).toHaveText("Measurement (km)");
});

test("Log session: measurement field is absent for practices without it", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Deep Work", evidenceTypes: ["timer", "notes"] });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Log session" }).click();
  await expect(page.locator("#log-measurement")).toHaveCount(0);
});
