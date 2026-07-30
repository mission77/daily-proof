import { test, expect } from "@playwright/test";
import { seedAccess, seedActiveSession, seedPractice } from "./helpers";

// The desktop "← Studio" link in Focus Mode must be pure navigation: it
// must never pause, finish, reset, or otherwise touch the active session.

test("Stopwatch running: Studio link leaves it running, Return to session resumes it accurately", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 10_000).toISOString(),
    accumulatedMs: 10_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
  });
  await page.goto("/focus");
  await expect(page.getByRole("timer", { name: /Elapsed time/ })).toBeVisible();

  const studioLink = page.getByRole("link", { name: /Back to Studio/ });
  await expect(studioLink).toBeVisible();
  await studioLink.click();

  await expect(page).toHaveURL("/studio");
  await expect(page.getByText("Session in progress")).toBeVisible();
  const returnButton = page.getByRole("button", { name: "Return to session" });
  await expect(returnButton).toBeVisible();
  await returnButton.click();

  await expect(page).toHaveURL("/focus");
  // Still running — the session was never paused by leaving/returning, so
  // elapsed keeps climbing from where it was, not from zero.
  const timerEl = page.getByRole("timer", { name: /Elapsed time/ });
  await expect(timerEl).toBeVisible();
  const label = await timerEl.getAttribute("aria-label");
  expect(label).not.toMatch(/Elapsed time 00:00/);
});

test("Timer paused: Studio link preserves the pause and exact accumulated time", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 120_000).toISOString(),
    accumulatedMs: 42_000,
    lastResumedAt: null,
    status: "paused",
    mode: "timer",
    plannedDurationMs: 25 * 60_000,
  });
  await page.goto("/focus");
  await expect(page.getByText("Paused")).toBeVisible();
  const before = await page.getByRole("timer", { name: /Time remaining/ }).getAttribute("aria-label");

  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await expect(page).toHaveURL("/studio");
  await page.getByRole("button", { name: "Return to session" }).click();

  await expect(page).toHaveURL("/focus");
  await expect(page.getByText("Paused")).toBeVisible();
  const after = await page.getByRole("timer", { name: /Time remaining/ }).getAttribute("aria-label");
  // Paused means the wall clock never accumulates more — should be exact.
  expect(after).toBe(before);
});

test("Timer completion (zero) while user is away on Studio, then returns to the prompt", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 65_000).toISOString(),
    accumulatedMs: 5_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
    mode: "timer",
    plannedDurationMs: 60_000,
  });
  await page.goto("/focus");
  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await expect(page).toHaveURL("/studio");

  // Simulate zero having been crossed while away: push accumulatedMs past
  // plannedDurationMs directly (see e2e/helpers.ts for why timestamps are
  // seeded rather than the clock mocked).
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 65_000).toISOString(),
    accumulatedMs: 65_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
    mode: "timer",
    plannedDurationMs: 60_000,
  });

  await page.getByRole("button", { name: "Return to session" }).click();
  await expect(page).toHaveURL("/focus");
  await expect(page.getByText("Time complete.")).toBeVisible();

  // The Studio link is present here too and is equally inert.
  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await expect(page).toHaveURL("/studio");
  await expect(page.getByText("Session in progress")).toBeVisible();
});

test("Overtime continues correctly across a Studio round-trip", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 65_000).toISOString(),
    accumulatedMs: 65_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
    mode: "timer",
    plannedDurationMs: 60_000,
    completionSoundPlayed: true,
    continuedPastPlanned: true,
  });
  await page.goto("/focus");
  await expect(page.getByRole("timer", { name: /Overtime/ })).toBeVisible();

  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await page.getByRole("button", { name: "Return to session" }).click();

  await expect(page.getByRole("timer", { name: /Overtime/ })).toBeVisible();
  await expect(page.getByText("Overtime", { exact: true })).toBeVisible();
});

test("Navigate Studio → Book → Settings → Focus: session survives the whole loop", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 10_000).toISOString(),
    accumulatedMs: 10_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
  });
  await page.goto("/focus");
  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await expect(page).toHaveURL("/studio");

  await page.getByRole("link", { name: "Book" }).click();
  await expect(page).toHaveURL("/book");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL("/settings");

  await page.getByRole("link", { name: "Studio", exact: true }).click();
  await expect(page).toHaveURL("/studio");
  await expect(page.getByText("Session in progress")).toBeVisible();
  await page.getByRole("button", { name: "Return to session" }).click();
  await expect(page).toHaveURL("/focus");
  await expect(page.getByRole("timer", { name: /Elapsed time/ })).toBeVisible();
});

test("Refreshing Studio while a session is active still shows it", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 10_000).toISOString(),
    accumulatedMs: 10_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
  });
  await page.goto("/studio");
  await expect(page.getByText("Session in progress")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Session in progress")).toBeVisible();
  await expect(page.getByRole("button", { name: "Return to session" })).toBeVisible();
});

test("Browser Back from Studio returns to Focus with the session intact", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 10_000).toISOString(),
    accumulatedMs: 10_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
  });
  await page.goto("/focus");
  await page.getByRole("link", { name: /Back to Studio/ }).click();
  await expect(page).toHaveURL("/studio");

  await page.goBack();
  await expect(page).toHaveURL("/focus");
  await expect(page.getByRole("timer", { name: /Elapsed time/ })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL("/studio");
});

test("Mobile viewport: Studio link is hidden, native back-equivalent (direct navigation) still preserves the session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await page.goto("/studio"); // real history entry, so Back below is meaningful
  await seedActiveSession(page, {
    practiceId: practice.id,
    practiceNameSnapshot: practice.name,
    startedAt: new Date(Date.now() - 10_000).toISOString(),
    accumulatedMs: 10_000,
    lastResumedAt: new Date().toISOString(),
    status: "running",
  });
  await page.goto("/focus");
  await expect(page.getByRole("link", { name: /Back to Studio/ })).toBeHidden();

  // Mobile has no in-page control — this models the native Back gesture,
  // which is a plain history navigation the app never intercepts.
  await page.goBack();
  await expect(page).toHaveURL("/studio");
  await expect(page.getByText("Session in progress")).toBeVisible();
});
