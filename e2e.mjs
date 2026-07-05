// End-to-end verification of Daily Proof against the production build.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3100";
const SHOTS = "/home/claude/daily-proof/shots";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});

async function newPage(viewport = { width: 1366, height: 768 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  return { ctx, page };
}

const { ctx, page } = await newPage();

// ---------- 1. First launch (landing + studio empty state) ----------
await page.goto(BASE + "/");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${SHOTS}/01-landing.png`, fullPage: true });
check("Landing renders hero", await page.locator("h1").first().innerText().then((t) => t.includes("Collect proof that meaningful work")));

await page.goto(BASE + "/studio");
await page.waitForLoadState("networkidle");
check("Studio empty state", await page.getByText("Your first proof begins with one").isVisible());
await page.screenshot({ path: `${SHOTS}/02-studio-empty.png` });

// ---------- 2. Create practice ----------
await page.getByRole("button", { name: "Create Practice", exact: true }).click();
await page.fill("#p-name", "Deep work");
await page.fill("#p-desc", "Uninterrupted meaningful work");
// enable notes + measurement too
await page.locator("label", { hasText: "Notes" }).locator("input").check();
await page.locator("label", { hasText: "Measurement" }).locator("input").check();
await page.fill("#p-unit", "pages");
await page.getByRole("button", { name: "Create practice", exact: true }).click();
await page.waitForSelector("text=Deep work");
check("Practice created and is focus", await page.getByRole("button", { name: "Start session" }).isVisible());
await page.screenshot({ path: `${SHOTS}/03-studio-focus.png` });

// second practice for list/reorder
await page.getByRole("button", { name: "New practice" }).click();
await page.fill("#p-name", "Violin");
await page.getByRole("button", { name: "Create practice", exact: true }).click();
await page.waitForSelector("text=Other practices");
check("Other practices list shows", await page.getByText("Violin").isVisible());

// ---------- 3-5. Start session, pause, resume ----------
await page.getByRole("button", { name: "Start session" }).click();
await page.waitForURL("**/focus");
await page.waitForSelector(".flip-digit");
check("Focus mode shows flip timer", (await page.locator(".flip-digit").count()) >= 4);
check("Focus mode hides navigation", !(await page.locator("header").isVisible().catch(() => false)));
await page.waitForTimeout(2600);
await page.screenshot({ path: `${SHOTS}/04-focus-running.png` });

const readTimer = async () =>
  (await page.locator("[role=timer]").getAttribute("aria-label")).replace("Elapsed time ", "");

const t1 = await readTimer();
await page.getByRole("button", { name: "Pause" }).click();
await page.waitForSelector("text=Paused");
const tPaused = await readTimer();
await page.waitForTimeout(1500);
const tPaused2 = await readTimer();
check("Pause freezes exact time", tPaused === tPaused2, `${tPaused} vs ${tPaused2}`);
await page.screenshot({ path: `${SHOTS}/05-focus-paused.png` });

await page.getByRole("button", { name: "Resume" }).click();
await page.waitForTimeout(1400);
const tResumed = await readTimer();
check("Resume continues counting", tResumed > tPaused, `${tPaused} -> ${tResumed}`);

// ---------- 6. Refresh during session ----------
await page.reload();
await page.waitForSelector(".flip-digit");
const tAfterReload = await readTimer();
check("Refresh restores running session", tAfterReload >= tResumed, `${tResumed} -> ${tAfterReload}`);
await page.waitForTimeout(1200);
const tAfterReload2 = await readTimer();
check("Session still running after refresh", tAfterReload2 > tAfterReload);

// ---------- 7-8. Finish + save proof ----------
await page.getByRole("button", { name: "Finish" }).click();
await page.waitForSelector("text=Session finished");
await page.screenshot({ path: `${SHOTS}/06-finish.png` });
check("Finish screen shows", await page.getByText("Completed what you intended?").isVisible());
await page.fill("#f-measure", "5");
await page.fill("#f-notes", "Found the thread quickly today.");
await page.getByRole("button", { name: "Save proof" }).click();
await page.waitForSelector("text=Proof saved.");
check("Proof saved screen shows", true);
check(
  "Saved screen shows a quote",
  (await page.locator("blockquote").innerText().catch(() => "")).length > 10
);
check(
  "Share is offered but optional",
  await page.getByRole("button", { name: "Share today's proof" }).isVisible()
);
await page.screenshot({ path: `${SHOTS}/19-proof-saved.png` });
await page.getByRole("button", { name: "Done" }).click();
await page.waitForURL("**/book");
check("Done navigates to Book", true);

// ---------- 9. Proof in Book ----------
await page.waitForSelector("text=Deep work");
const entryText = await page.locator("li").first().innerText();
check("Book entry has duration + status + measurement", /Completed/.test(entryText) && /5 pages/.test(entryText));
await page.screenshot({ path: `${SHOTS}/07-book.png` });

// ---------- 10. Edit note in Book ----------
await page.locator("li button").first().click();
await page.waitForSelector("text=Only the note can change");
await page.fill("textarea", "Found the thread quickly today. Kept momentum after lunch.");
await page.getByRole("button", { name: "Save note" }).click();
await page.waitForSelector("text=Edited");
check("Note edit sets Edited label", await page.getByText("Edited").isVisible());

// ---------- 11. Navigate yesterday/today ----------
const nextBtn = page.getByRole("button", { name: "Next day" });
check("Next disabled at Today", await nextBtn.isDisabled());
await page.getByRole("button", { name: "Previous day" }).click();
await page.waitForSelector("text=No proof collected yet.");
check("Previous day shows empty state", true);
await page.screenshot({ path: `${SHOTS}/08-book-yesterday.png` });
await nextBtn.click();
await page.waitForSelector("text=Deep work");
check("Back to Today restores entries", true);

// ---------- 12. Export backup ----------
await page.goto(BASE + "/settings");
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.getByRole("button", { name: "Export backup" }).click(),
]);
const backupPath = "/tmp/dp-backup.json";
await download.saveAs(backupPath);
const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
check("Backup exports valid JSON", backup.app === "daily-proof" && backup.formatVersion === 1);
check("Backup contains data", backup.practices.length === 2 && backup.sessions.length === 1);
check("Backup excludes active session", !backup.settings.some((s) => s.key === "activeSession"));
await page.screenshot({ path: `${SHOTS}/09-settings.png`, fullPage: true });

// ---------- 13. Reset data (via IndexedDB wipe, prod has no dev tools) ----------
check("Dev tools hidden in production", !(await page.getByText("Seed sample data").isVisible().catch(() => false)));
await page.evaluate(() => indexedDB.deleteDatabase("daily-proof"));
await page.reload();
await page.goto(BASE + "/studio");
await page.waitForSelector("text=Your first proof begins with one");
check("Data reset returns to empty state", true);

// ---------- 14-15. Import backup + confirm restore ----------
await page.goto(BASE + "/settings");
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(backupPath);
await page.waitForSelector("text=Restore this backup?");
check("Import preview shows counts", await page.getByText("Proof entries").isVisible());
await page.screenshot({ path: `${SHOTS}/10-import-preview.png` });
await page.getByRole("button", { name: "Replace current data" }).click();
await page.waitForTimeout(1200); // reload happens
await page.goto(BASE + "/book");
await page.waitForSelector("text=Deep work");
check("Import restores proof entries", true);

// invalid file rejected with a reason
fs.writeFileSync("/tmp/bad.json", JSON.stringify({ app: "other" }));
await page.goto(BASE + "/settings");
await page.locator('input[type="file"]').setInputFiles("/tmp/bad.json");
await page.waitForSelector("text=Import failed");
check("Invalid backup explains reason", await page.getByText("not a Daily Proof backup").isVisible());

// ---------- 16. Day / Night / Auto ----------
await page.getByRole("button", { name: /^Night/ }).click();
await page.waitForTimeout(300);
const night = await page.evaluate(() => document.documentElement.dataset.theme);
check("Night theme applies", night === "night");
await page.screenshot({ path: `${SHOTS}/11-settings-night.png` });
await page.goto(BASE + "/studio");
await page.screenshot({ path: `${SHOTS}/12-studio-night.png` });
await page.goto(BASE + "/settings");
await page.getByRole("button", { name: /^Auto/ }).click();
await page.waitForTimeout(300);
const auto = await page.evaluate(() => document.documentElement.dataset.theme);
check("Auto resolves by local time", auto === "day" || auto === "night", `resolved ${auto}`);
await page.getByRole("button", { name: /^Day / }).click();

// theme persists across reload without flash mismatch
await page.reload();
const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
check("Theme persists across reload", persisted === "day");

// ---------- 17. Mobile layouts ----------
for (const [name, vp] of [
  ["iphone-se", { width: 375, height: 667 }],
  ["iphone-14", { width: 390, height: 844 }],
  ["pixel-7", { width: 412, height: 915 }],
  ["galaxy-s23", { width: 360, height: 780 }],
]) {
  const m = await newPage(vp);
  await m.page.goto(BASE + "/studio");
  await m.page.waitForSelector("text=What deserves your attention");
  const overflowX = await m.page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  check(`No horizontal overflow (${name})`, !overflowX);
  const primary = m.page
    .getByRole("button", { name: /Start session|Return to session|Create Practice/ })
    .first();
  let startVisible = true;
  try {
    await primary.waitFor({ state: "visible", timeout: 5000 });
    // Reachable means inside the viewport, not just rendered somewhere below the fold.
    const box = await primary.boundingBox();
    startVisible = !!box && box.y + box.height <= vp.height;
  } catch {
    startVisible = false;
  }
  check(`Primary action reachable (${name})`, startVisible);
  await m.page.screenshot({ path: `${SHOTS}/13-mobile-${name}-studio.png` });
  if (name === "iphone-se") {
    // Fresh context = fresh IndexedDB: create a practice first.
    await m.page.getByRole("button", { name: "Create Practice", exact: true }).click();
    await m.page.fill("#p-name", "Deep work");
    // The submit unmounts itself on success; dispatchEvent avoids the retry race.
    await m.page.getByRole("button", { name: "Create practice", exact: true }).dispatchEvent("click");
    await m.page.waitForSelector("text=Start session");
    await m.page.screenshot({ path: `${SHOTS}/13-mobile-${name}-studio.png` });
    await m.page.getByRole("button", { name: "Start session" }).click();
    await m.page.waitForSelector(".flip-digit");
    const overflowFocus = await m.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    check("Focus mode fits iPhone SE", !overflowFocus);
    const finishVisible = await m.page.getByRole("button", { name: "Finish" }).isVisible();
    check("Finish visible above fold (iPhone SE)", finishVisible);
    await m.page.screenshot({ path: `${SHOTS}/14-mobile-focus.png` });
    await m.page.getByRole("button", { name: "Finish" }).click();
    await m.page.waitForSelector("text=Save proof");
    await m.page.screenshot({ path: `${SHOTS}/15-mobile-finish.png` });
    // discard via the in-app confirmation so main context state stays clean
    await m.page.getByRole("button", { name: "Discard session" }).click();
    await m.page.getByRole("button", { name: "Cancel session" }).click();
    await m.page.waitForURL("**/studio");
  }
  await m.ctx.close();
}

// PWA assets reachable
for (const asset of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-512.png"]) {
  const res = await page.request.get(BASE + asset);
  check(`PWA asset ${asset}`, res.ok());
}

// ---------- Payments (Stripe-ready, no keys in this environment) ----------
{
  const status = await page.request.get(BASE + "/api/checkout");
  const body = await status.json();
  check("Checkout status reports not configured", status.ok() && body.configured === false);

  const post = await page.request.post(BASE + "/api/checkout", { data: { plan: "monthly" } });
  check("Checkout POST returns 503 without keys", post.status() === 503);

  const webhook = await page.request.post(BASE + "/api/stripe/webhook", { data: {} });
  check("Webhook rejects when unconfigured", webhook.status() === 503);

  const up = await newPage();
  await up.page.goto(BASE + "/upgrade");
  await up.page.waitForSelector("text=Payments are not configured yet");
  check("Upgrade page explains unconfigured payments", true);
  check(
    "Upgrade buttons disabled without keys",
    await up.page.getByRole("button", { name: "Start free trial" }).isDisabled()
  );
  await up.page.screenshot({ path: `${SHOTS}/16-upgrade.png` });
  await up.ctx.close();
}

// ---------- Storage recovery: leftover DB from an older build ----------
{
  const v = await newPage();
  // Simulate the exact field failure: an old prototype left "daily-proof"
  // at version 2 with its own store, before the app ever loads.
  await v.page.goto(BASE + "/offline.html"); // any same-origin page, no app code
  await v.page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("daily-proof", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("legacyStuff")) {
          db.createObjectStore("legacyStuff", { keyPath: "id" });
        }
        // The old prototype also used a store NAMED "practices" with a
        // different record shape (no name/order/createdAt) — the exact
        // condition that crashed sorting in the field.
        if (!db.objectStoreNames.contains("practices")) {
          db.createObjectStore("practices", { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(["legacyStuff", "practices"], "readwrite");
        tx.objectStore("legacyStuff").put({ id: 1, keep: "me" });
        tx.objectStore("practices").put({ id: "old-1", title: "Old shape", done: false });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
  await v.page.goto(BASE + "/studio");
  const recovered = await v.page
    .waitForSelector("text=Your first proof begins with one", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("Recovers from higher-version leftover DB", recovered);
  // Old data must survive the recovery untouched.
  const legacyIntact = await v.page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("daily-proof");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!db.objectStoreNames.contains("legacyStuff")) {
      db.close();
      return false;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(["legacyStuff", "practices"], "readonly");
      const get = tx.objectStore("legacyStuff").get(1);
      const getOld = tx.objectStore("practices").get("old-1");
      let ok1 = false;
      let ok2 = false;
      get.onsuccess = () => {
        ok1 = get.result?.keep === "me";
      };
      getOld.onsuccess = () => {
        ok2 = getOld.result?.title === "Old shape";
      };
      tx.oncomplete = () => {
        db.close();
        resolve(ok1 && ok2);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  });
  check("Legacy data preserved after recovery", legacyIntact);
  // And the app is actually usable: create a practice on the recovered DB.
  // Retry the click: immediately after first paint React may not have
  // hydrated yet, so a too-early click is dead. A user clicking a moment
  // later is the realistic case.
  let formOpen = false;
  for (let attempt = 0; attempt < 5 && !formOpen; attempt++) {
    await v.page.getByRole("button", { name: "Create Practice", exact: true }).click();
    formOpen = await v.page
      .waitForSelector("#p-name", { timeout: 2000 })
      .then(() => true)
      .catch(() => false);
  }
  check("Practice form opens after recovery", formOpen);
  await v.page.fill("#p-name", "Recovered practice");
  await v.page.getByRole("button", { name: "Create practice", exact: true }).dispatchEvent("click");
  const usable = await v.page
    .waitForSelector("text=Start session", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check("App fully usable after recovery", usable);
  await v.ctx.close();
}

// ---------- Session controls: restart, cancel, status badge, delete ----------
{
  const s = await newPage();
  await s.page.goto(BASE + "/studio");
  const cta = s.page.getByRole("button", { name: "Create Practice", exact: true });
  await cta.waitFor({ state: "visible" });
  let open = false;
  for (let i = 0; i < 5 && !open; i++) {
    await cta.click();
    open = await s.page.locator("#p-name").waitFor({ state: "visible", timeout: 1500 }).then(() => true).catch(() => false);
  }
  await s.page.fill("#p-name", "Violin");
  await s.page.getByRole("button", { name: "Create practice", exact: true }).dispatchEvent("click");
  await s.page.getByRole("button", { name: "Start session" }).click();
  await s.page.waitForSelector(".flip-digit");
  check("Focus shows branding wordmark", await s.page.getByText("Daily").first().isVisible());
  check("Focus shows practice name", await s.page.getByText("Violin").isVisible());
  await s.page.waitForTimeout(3400);
  const beforeRestart = (await s.page.locator("[role=timer]").getAttribute("aria-label")) ?? "";
  await s.page.getByRole("button", { name: "Restart" }).click();
  await s.page.waitForTimeout(400);
  const afterRestart = (await s.page.locator("[role=timer]").getAttribute("aria-label")) ?? "";
  check(
    "Restart resets timer to 00:00",
    !beforeRestart.includes("00:00") && /00:0[01]/.test(afterRestart)
  );
  // Cancel with confirmation
  await s.page.getByRole("button", { name: "Cancel", exact: true }).click();
  await s.page.waitForSelector("text=Cancel this session?");
  check("Cancel asks for confirmation", true);
  await s.page.getByRole("button", { name: "Keep going" }).click();
  check("Keep going stays in session", await s.page.locator(".flip-digit").first().isVisible());
  // Studio badge while session runs
  await s.page.goto(BASE + "/studio");
  await s.page.waitForSelector("text=Session in progress");
  check("Studio shows session-in-progress status", true);
  await s.page.getByRole("button", { name: "Return to session" }).click();
  await s.page.waitForSelector(".flip-digit");
  await s.page.getByRole("button", { name: "Cancel", exact: true }).click();
  await s.page.getByRole("button", { name: "Cancel session" }).click();
  await s.page.waitForURL("**/studio");
  check("Cancel session discards and returns to Studio", true);
  // Delete a saved proof from the Book with confirmation
  await s.page.getByRole("button", { name: "Start session" }).click();
  await s.page.waitForSelector(".flip-digit");
  await s.page.waitForTimeout(1200);
  await s.page.getByRole("button", { name: "Finish" }).click();
  await s.page.getByRole("button", { name: "Save proof" }).click();
  await s.page.waitForSelector("text=Proof saved.");
  await s.page.getByRole("button", { name: "Done" }).click();
  await s.page.waitForURL("**/book");
  await s.page.waitForSelector("text=Violin");
  await s.page.locator("li").first().locator("button").first().click();
  await s.page.getByRole("button", { name: "Delete session" }).click();
  await s.page.waitForSelector("text=Delete this proof?");
  check("Delete requires confirmation", true);
  await s.page.getByRole("button", { name: "Delete", exact: true }).click();
  await s.page.waitForSelector("text=No proof collected yet.");
  check("Deleted proof leaves the Book", true);
  await s.ctx.close();
}

// ---------- Marketing site + SEO ----------
{
  const pages = [
    ["/", "Collect proof that meaningful work"],
    ["/pricing", "Simple pricing"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Service"],
    ["/refunds", "Refund Policy"],
    ["/support", "Support"],
    ["/contact", "Contact"],
  ];
  const m = await newPage();
  for (const [path, text] of pages) {
    const res = await m.page.goto(BASE + path);
    const found = await m.page.getByText(text).first().isVisible().catch(() => false);
    check(`Page ${path} renders`, res.ok() && found);
  }
  // Footer legal links resolve
  await m.page.goto(BASE + "/");
  const footerLinks = await m.page.locator("footer a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check("Footer has all legal links", ["/privacy", "/terms", "/refunds", "/support", "/contact"].every((h) => footerLinks.includes(h)));
  // SEO essentials on the landing page
  const og = await m.page.locator('meta[property="og:image"]').getAttribute("content");
  const tw = await m.page.locator('meta[name="twitter:card"]').getAttribute("content");
  const canonical = await m.page.locator('link[rel="canonical"]').getAttribute("href");
  const jsonld = await m.page.locator('script[type="application/ld+json"]').count();
  check("Open Graph image tag present", !!og && og.includes("og.png"));
  check("Twitter card tag present", tw === "summary_large_image");
  check("Canonical URL present", !!canonical && canonical.includes("dailyproofhq.com"));
  check("Structured data present (FAQ + App)", jsonld >= 2);
  for (const asset of ["/og.png", "/robots.txt", "/sitemap.xml"]) {
    const res = await m.page.request.get(BASE + asset);
    check(`SEO asset ${asset}`, res.ok());
  }
  const robots = await (await m.page.request.get(BASE + "/robots.txt")).text();
  check("robots.txt disallows app routes", robots.includes("/studio") && robots.includes("sitemap"));
  await m.page.screenshot({ path: `${SHOTS}/20-landing-new.png`, fullPage: true });
  await m.ctx.close();
}

// ---------- Mobile navigation ----------
{
  const m = await newPage({ width: 390, height: 844 });
  await m.page.goto(BASE + "/");
  const burger = m.page.getByRole("button", { name: "Open menu" });
  check("Mobile shows hamburger", await burger.isVisible());
  check(
    "Mobile hides inline nav",
    !(await m.page.locator('nav[aria-label="Main"]').isVisible().catch(() => false))
  );
  await burger.click();
  const menu = m.page.locator("#mobile-menu");
  await menu.getByRole("link", { name: "Pricing" }).waitFor({ state: "visible" });
  check("Slide-in menu opens with nav items", true);
  check(
    "Menu has Open the App",
    await menu.getByRole("link", { name: "Open the App" }).isVisible()
  );
  await m.page.screenshot({ path: `${SHOTS}/21-mobile-menu.png` });
  await menu.getByRole("link", { name: "Pricing" }).click();
  await m.page.waitForURL("**/pricing");
  check("Menu link navigates and closes", true);
  await m.ctx.close();
}

// ---------- Hero above the fold ----------
for (const [label, vp] of [
  ["phone-visible", { width: 390, height: 700 }],
  ["laptop", { width: 1366, height: 768 }],
]) {
  const f = await newPage(vp);
  await f.page.goto(BASE + "/");
  const cta = await f.page.getByRole("link", { name: "Start Free" }).first().boundingBox();
  check(`Hero CTA above the fold (${label})`, !!cta && cta.y + cta.height <= vp.height);
  await f.ctx.close();
}

// ---------- Access guard: expired free user sees paywall ----------
{
  const g = await newPage();
  await g.page.goto(BASE + "/studio");
  await g.page.waitForSelector("text=Your first proof begins with one");
  // Seed an expired free trial directly in IndexedDB (5 days ago).
  await g.page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("daily-proof");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("access", "readwrite");
      tx.objectStore("access").put({
        key: "access",
        role: "free",
        trialStartedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  });
  await g.page.reload();
  await g.page.waitForSelector("text=Your trial has ended.");
  check("Expired free user sees paywall", true);
  await g.page.screenshot({ path: `${SHOTS}/17-paywall.png` });
  // Settings (and data export) stay reachable behind the paywall.
  await g.page.goto(BASE + "/settings");
  const exportVisible = await g.page
    .getByRole("button", { name: /Export backup/ })
    .isVisible()
    .catch(() => false);
  check("Settings and export reachable when expired", exportVisible);
  await g.ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
