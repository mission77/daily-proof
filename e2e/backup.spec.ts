import { test, expect } from "@playwright/test";
import { seedAccess, seedPractice, readSessions } from "./helpers";

// Backup export/import must keep working across the Timer data-model change
// (SessionEntry.mode / plannedDurationMs) and must still accept older
// backups that predate those fields entirely.

test("export includes a Timer proof, and re-importing it (Replace) restores it intact", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  const practice = await seedPractice(page, { name: "Deep Work" });
  await page.evaluate((practiceId) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("daily-proof", 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("sessions", "readwrite");
        tx.objectStore("sessions").put({
          id: "s1",
          practiceId,
          practiceNameSnapshot: "Deep Work",
          durationMs: 60_000,
          completed: true,
          noteEdited: false,
          mode: "timer",
          plannedDurationMs: 60_000,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, practice.id);

  await page.goto("/settings");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import("fs");
  const content = fs.readFileSync(path!, "utf8");
  const backup = JSON.parse(content);
  expect(backup.app).toBe("daily-proof");
  const exportedSession = backup.sessions.find((s: any) => s.id === "s1");
  expect(exportedSession.mode).toBe("timer");
  expect(exportedSession.plannedDurationMs).toBe(60_000);

  // Clear local data, then import the exported file back in.
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("daily-proof", 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(["sessions", "practices"], "readwrite");
        tx.objectStore("sessions").clear();
        tx.objectStore("practices").clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
  await page.reload();
  expect(await readSessions(page)).toHaveLength(0);

  await page.getByRole("button", { name: "Import backup" }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(content) });

  await expect(page.getByText("Proof entries")).toBeVisible();
  await page.getByRole("button", { name: "Replace current data" }).click();

  await expect
    .poll(async () => (await readSessions(page)).length)
    .toBe(1);
  const restored = await readSessions(page);
  expect(restored[0].mode).toBe("timer");
  expect(restored[0].plannedDurationMs).toBe(60_000);

  await page.goto("/book");
  await expect(page.getByText("Planned 1m")).toBeVisible();
});

test("older backup without mode/plannedDurationMs still imports cleanly", async ({ page }) => {
  await page.goto("/");
  await seedAccess(page);
  await page.goto("/settings");

  const oldBackup = {
    app: "daily-proof",
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    practices: [
      {
        id: "p-old",
        name: "Reading",
        evidenceTypes: ["timer"],
        archived: false,
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    sessions: [
      {
        id: "s-old",
        practiceId: "p-old",
        practiceNameSnapshot: "Reading",
        durationMs: 120_000,
        completed: true,
        noteEdited: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // no `mode`, no `plannedDurationMs` — pre-Timer shape
      },
    ],
    settings: [],
    access: null,
  };

  await page.getByRole("button", { name: "Import backup" }).click();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "old-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(oldBackup)),
  });
  await expect(page.getByText("Proof entries")).toBeVisible();
  await page.getByRole("button", { name: "Merge into current data" }).click();

  await expect.poll(async () => (await readSessions(page)).length).toBe(1);
  const sessions = await readSessions(page);
  expect(sessions[0].mode).toBeUndefined();

  await page.goto("/book");
  await expect(page.getByText("Reading")).toBeVisible();
  await expect(page.getByText(/Planned/)).not.toBeVisible();
});
