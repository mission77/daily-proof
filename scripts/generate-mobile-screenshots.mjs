// Generates real mobile-viewport screenshots of the four "How it works"
// moments (Studio, Focus, Reflect, Book) against a running production
// server, so the homepage can show phones what a phone actually sees
// instead of a shrunk desktop capture. Run against `npm run start` on
// port 3000 (see package.json's build/start scripts). Not part of the
// Playwright test suite — a one-off content generator, like the original
// desktop screenshots.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://localhost:3000";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "screens");
const VIEWPORT = { width: 390, height: 844 };

async function seedAccessAndPractice(page) {
  await page.goto(BASE + "/");
  await page.evaluate(async () => {
    const DB_NAME = "daily-proof";
    const DB_VERSION = 1;
    function put(store, record) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("practices")) {
            const s = db.createObjectStore("practices", { keyPath: "id" });
            s.createIndex("order", "order");
          }
          if (!db.objectStoreNames.contains("sessions")) {
            const s = db.createObjectStore("sessions", { keyPath: "id" });
            s.createIndex("completedAt", "completedAt");
          }
          if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
          if (!db.objectStoreNames.contains("access")) db.createObjectStore("access", { keyPath: "key" });
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(store, "readwrite");
          tx.objectStore(store).put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    }
    const now = new Date().toISOString();
    await put("access", { key: "access", role: "owner", updatedAt: now });
    await put("practices", {
      id: "screenshot-deep-work",
      name: "Deep work",
      description: "Uninterrupted, meaningful work",
      evidenceTypes: ["timer", "notes", "measurement"],
      measurementUnit: "pages",
      archived: false,
      order: 0,
      createdAt: now,
      updatedAt: now,
    });
    await put("practices", {
      id: "screenshot-reading",
      name: "Reading",
      evidenceTypes: ["timer", "notes"],
      archived: false,
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3, colorScheme: "light" });
  const page = await context.newPage();

  await seedAccessAndPractice(page);

  // ---------- Studio: choosing today's focus ----------
  await page.goto(BASE + "/studio");
  await page.waitForSelector("text=Deep work");
  await page.getByRole("radio", { name: "Timer" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "studio-mobile.png") });
  console.log("saved studio-mobile.png");

  // ---------- Focus: a Timer session counting down ----------
  await page.getByRole("button", { name: "Start session" }).click();
  await page.waitForURL("**/focus");
  await page.waitForSelector(".flip-digit");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "focus-mobile.png") });
  console.log("saved focus-mobile.png");

  // ---------- Reflect: the finish form ----------
  await page.getByRole("button", { name: "Finish" }).click();
  await page.waitForSelector("text=Session finished");
  await page.fill("#f-measure", "6");
  await page.fill("#f-notes", "Found the thread quickly today and kept going.");
  await page.screenshot({ path: path.join(OUT, "reflect-mobile.png") });
  console.log("saved reflect-mobile.png");

  // ---------- Book: a day of saved proof ----------
  await page.getByRole("button", { name: "Save proof" }).click();
  await page.waitForSelector("text=Proof saved.");
  await page.getByRole("button", { name: "Done" }).click();
  await page.waitForURL("**/book");
  await page.waitForSelector("text=Deep work");
  await page.screenshot({ path: path.join(OUT, "book-mobile.png") });
  console.log("saved book-mobile.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
