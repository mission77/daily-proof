import { test, expect } from "@playwright/test";
import { seedAccess, seedPractice, seedSession } from "./helpers";

// Consistency pass: Timer, Stopwatch, and Log Session all end on the same
// Proof Saved screen (Share proof primary, Done secondary), and every proof
// already sitting in the Book — not just the one just finished — can
// generate the same kind of share card.

test("Stopwatch: Proof Saved screen leads with Share proof, Done is secondary", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedPractice(page, { name: "Deep Work" });
  await page.goto("/studio");

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page).toHaveURL("/focus");
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("button", { name: "Save proof" }).click();

  await expect(page.getByText("Proof saved.")).toBeVisible();
  const shareButton = page.getByRole("button", { name: "Share proof" });
  const doneButton = page.getByRole("button", { name: "Done" });
  await expect(shareButton).toBeVisible();
  await expect(shareButton).toHaveClass(/btn-primary/);
  await expect(doneButton).toHaveClass(/btn-quiet/);

  // Share proof leads (encourages sharing first); Done still lets the user
  // leave immediately without sharing.
  const shareBox = await shareButton.boundingBox();
  const doneBox = await doneButton.boundingBox();
  expect(shareBox?.y).toBeLessThan(doneBox?.y ?? Infinity);

  await doneButton.click();
  await expect(page).toHaveURL("/book");
});

test("Book: every saved proof has a Share icon that generates a card without crashing", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await seedSession(page, {
    practiceNameSnapshot: "Morning Run",
    durationMs: 32 * 60_000,
    quote: { id: "fi1", text: "The body keeps an honest ledger." },
  });
  await page.goto("/book");

  await expect(page.getByText("Morning Run")).toBeVisible();
  const shareIcon = page.getByRole("button", { name: "Share proof for Morning Run" });
  await expect(shareIcon).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    shareIcon.click(),
  ]);
  expect(download.suggestedFilename()).toBe("daily-proof.png");

  // Clicking the icon must not also open the note editor underneath it.
  await expect(page.getByRole("dialog", { name: "Edit note" })).toHaveCount(0);
});

test("Book: sharing an entry saved before quotes were snapshotted still works (falls back gracefully)", async ({
  page,
}) => {
  await page.goto("/");
  await seedAccess(page);
  await seedSession(page, { practiceNameSnapshot: "Legacy Session", durationMs: 20 * 60_000 });
  await page.goto("/book");

  const shareIcon = page.getByRole("button", { name: "Share proof for Legacy Session" });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    shareIcon.click(),
  ]);
  expect(download.suggestedFilename()).toBe("daily-proof.png");
});
