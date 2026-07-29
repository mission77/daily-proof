import { test, expect } from "@playwright/test";
import { seedAccess, seedActiveSession, seedPractice, readSessions } from "./helpers";

test.describe("Timer setup (Studio)", () => {
  test("presets, custom validation, and Start disabling", async ({ page }) => {
    // Seed from "/" (marketing, outside AccessGuard): AccessGuard writes a
    // default "free" AccessState the first time it reads one that doesn't
    // exist, which can race with (and clobber) a seed written right after
    // navigating straight to a guarded route.
    await page.goto("/");
    await seedAccess(page);
    await seedPractice(page, { name: "Writing" });
    await page.goto("/studio");

    await page.getByRole("radio", { name: "Timer" }).click();
    // A preset is selected by default once Timer mode is chosen.
    await expect(page.getByRole("button", { name: "Start session" })).toBeEnabled();

    await page.getByRole("radio", { name: "60 min" }).click();
    await expect(page.getByRole("radio", { name: "60 min" })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("radio", { name: "Custom" }).click();
    const customInput = page.getByLabel("Custom duration in minutes");

    await customInput.fill("0");
    await expect(page.getByText("Duration must be more than zero.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start session" })).toBeDisabled();

    await customInput.fill("-5");
    await expect(page.getByText("Enter a number of minutes.")).toBeVisible();

    await customInput.fill("abc");
    await expect(page.getByText("Enter a number of minutes.")).toBeVisible();

    await customInput.fill("481");
    await expect(page.getByText(/Keep it under/)).toBeVisible();

    await customInput.fill("45");
    await expect(page.getByText("Enter a number of minutes.")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Start session" })).toBeEnabled();
  });
});

test.describe("Timer session (Focus)", () => {
  test("counts down and allows early finish (not an error)", async ({ page }) => {
    // Seed from "/" (marketing, outside AccessGuard): AccessGuard writes a
    // default "free" AccessState the first time it reads one that doesn't
    // exist, which can race with (and clobber) a seed written right after
    // navigating straight to a guarded route.
    await page.goto("/");
    await seedAccess(page);
    const practice = await seedPractice(page, { name: "Deep Work" });
    await seedActiveSession(page, {
      practiceId: practice.id,
      practiceNameSnapshot: practice.name,
      startedAt: new Date(Date.now() - 5_000).toISOString(),
      accumulatedMs: 5_000,
      lastResumedAt: new Date().toISOString(),
      status: "running",
      mode: "timer",
      plannedDurationMs: 25 * 60_000,
    });
    await page.goto("/focus");

    await expect(page.getByRole("timer", { name: /Time remaining/ })).toBeVisible();
    // Nowhere near zero yet — finishing now is an early finish, not an error.
    await page.getByRole("button", { name: "Finish" }).click();
    await expect(page.getByText("Completed what you intended?")).toBeVisible();
    await page.getByRole("radio", { name: "Not quite" }).click();
    await page.getByRole("button", { name: "Save proof" }).click();
    await expect(page.getByText("Proof saved.")).toBeVisible();
  });

  test("reaching zero shows the completion prompt exactly once, sound flag persists across refresh", async ({
    page,
  }) => {
    // Seed from "/" (marketing, outside AccessGuard): AccessGuard writes a
    // default "free" AccessState the first time it reads one that doesn't
    // exist, which can race with (and clobber) a seed written right after
    // navigating straight to a guarded route.
    await page.goto("/");
    await seedAccess(page);
    const practice = await seedPractice(page, { name: "Deep Work" });
    // accumulatedMs already exceeds plannedDurationMs — reaches zero without
    // any real time passing in the test, per the isolated-timestamp approach
    // in e2e/helpers.ts.
    await seedActiveSession(page, {
      practiceId: practice.id,
      practiceNameSnapshot: practice.name,
      startedAt: new Date(Date.now() - 70_000).toISOString(),
      accumulatedMs: 65_000,
      lastResumedAt: new Date().toISOString(),
      status: "running",
      mode: "timer",
      plannedDurationMs: 60_000,
    });
    await page.goto("/focus");

    await expect(page.getByText("Time complete.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish session" })).toBeFocused();

    // The completion effect persists completionSoundPlayed so a refresh right
    // after zero can't replay the sound or duplicate the event.
    await expect
      .poll(async () => {
        const sessions = await page.evaluate(() => {
          return new Promise((resolve) => {
            const req = indexedDB.open("daily-proof", 1);
            req.onsuccess = () => {
              const tx = req.result.transaction("settings", "readonly");
              const getReq = tx.objectStore("settings").get("activeSession");
              getReq.onsuccess = () => resolve(getReq.result?.value?.completionSoundPlayed ?? false);
            };
          });
        });
        return sessions;
      })
      .toBe(true);

    await page.reload();
    await expect(page.getByText("Time complete.")).toBeVisible();
  });

  test("continue working enters overtime and preserves elapsed time", async ({ page }) => {
    // Seed from "/" (marketing, outside AccessGuard): AccessGuard writes a
    // default "free" AccessState the first time it reads one that doesn't
    // exist, which can race with (and clobber) a seed written right after
    // navigating straight to a guarded route.
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
      completionSoundPlayed: true, // already handled — isolates this test from the sound effect
    });
    await page.goto("/focus");

    await expect(page.getByText("Time complete.")).toBeVisible();
    await page.getByRole("button", { name: "Continue working" }).click();

    await expect(page.getByRole("timer", { name: /Overtime/ })).toBeVisible();
    await expect(page.getByText("Overtime", { exact: true })).toBeVisible();
  });

  test("saved Timer proof carries the planned duration into the Book", async ({ page }) => {
    // Seed from "/" (marketing, outside AccessGuard): AccessGuard writes a
    // default "free" AccessState the first time it reads one that doesn't
    // exist, which can race with (and clobber) a seed written right after
    // navigating straight to a guarded route.
    await page.goto("/");
    await seedAccess(page);
    const practice = await seedPractice(page, { name: "Deep Work" });
    await seedActiveSession(page, {
      practiceId: practice.id,
      practiceNameSnapshot: practice.name,
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      accumulatedMs: 60_000,
      lastResumedAt: new Date().toISOString(),
      status: "running",
      mode: "timer",
      plannedDurationMs: 60_000,
      completionSoundPlayed: true,
    });
    await page.goto("/focus");

    await expect(page.getByText("Time complete.")).toBeVisible();
    await page.getByRole("button", { name: "Finish session" }).click();
    await page.getByRole("button", { name: "Save proof" }).click();
    await expect(page.getByText("Proof saved.")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page).toHaveURL("/book");
    await expect(page.getByText("Planned 1m")).toBeVisible();

    const sessions = await readSessions(page);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].mode).toBe("timer");
    expect(sessions[0].plannedDurationMs).toBe(60_000);
  });
});
