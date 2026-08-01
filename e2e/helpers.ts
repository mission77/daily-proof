import { Page } from "@playwright/test";

// Direct IndexedDB seeding — mirrors lib/db.ts's store setup in plain JS so
// it can run inside page.evaluate (no bundler, no TS imports at runtime).
// This is the "isolated test mechanism" for Timer time-based scenarios:
// instead of mocking the browser clock (Playwright's page.clock needs
// 'unsafe-eval', which the production CSP deliberately does not grant, and
// tests must never weaken that to pass), a session's stored timestamps are
// just written directly — accumulatedMs/lastResumedAt/startedAt are exactly
// what the app itself reads to compute elapsed time, so this exercises the
// real code path, not a mocked one. Each Playwright test already gets a
// fresh browser context (and therefore an empty IndexedDB), so no reset step
// is needed between tests.

const DB_NAME = "daily-proof";
const DB_VERSION = 1;

async function seedRecord(page: Page, store: string, record: unknown): Promise<void> {
  await page.evaluate(
    ({ store, record, DB_NAME, DB_VERSION }) => {
      return new Promise<void>((resolve, reject) => {
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
          tx.objectStore(store).put(record as object);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    },
    { store, record, DB_NAME, DB_VERSION }
  );
}

export interface SeedPractice {
  id: string;
  name: string;
  description?: string;
  evidenceTypes: string[];
  measurementUnit?: string;
  archived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export function newPractice(overrides: Partial<SeedPractice> = {}): SeedPractice {
  const now = new Date().toISOString();
  return {
    id: `practice-${Math.random().toString(36).slice(2)}`,
    name: "Deep work",
    evidenceTypes: ["timer"],
    archived: false,
    order: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export async function seedPractice(page: Page, overrides: Partial<SeedPractice> = {}): Promise<SeedPractice> {
  const practice = newPractice(overrides);
  await seedRecord(page, "practices", practice);
  return practice;
}

export interface SeedActiveSession {
  practiceId: string;
  practiceNameSnapshot: string;
  startedAt: string;
  accumulatedMs: number;
  lastResumedAt: string | null;
  status: "running" | "paused" | "finishing";
  finishedElapsedMs?: number;
  mode?: "stopwatch" | "timer";
  plannedDurationMs?: number;
  completionSoundPlayed?: boolean;
  continuedPastPlanned?: boolean;
}

export async function seedActiveSession(page: Page, session: SeedActiveSession): Promise<void> {
  await seedRecord(page, "settings", { key: "activeSession", value: session });
}

export async function seedSetting(page: Page, key: string, value: unknown): Promise<void> {
  await seedRecord(page, "settings", { key, value });
}

/** Grants full access directly, bypassing checkout/access-code UI entirely.
 *  Tests run against the production build (see playwright.config.ts — the
 *  strict CSP has no 'unsafe-eval', which breaks Next's dev-mode bundler,
 *  so `next dev` isn't a viable target here regardless), where AccessGuard
 *  defaults to role "free" with no signed license — this seeds the same
 *  AccessState record the app itself would write after a real code
 *  redemption or Stripe activation, so every other test can assume it's
 *  already unlocked. */
export async function seedAccess(
  page: Page,
  role: string = "owner",
  license?: { token?: string; expiresAt?: string | null }
): Promise<void> {
  await seedRecord(page, "access", {
    key: "access",
    role,
    updatedAt: new Date().toISOString(),
    ...(license
      ? { license: { code: "test", role, expiresAt: license.expiresAt ?? null, validatedAt: new Date().toISOString(), token: license.token } }
      : {}),
  });
}

export interface SeedSession {
  id: string;
  practiceId: string;
  practiceNameSnapshot: string;
  durationMs: number;
  completed: boolean;
  measurement?: number;
  measurementUnit?: string;
  notes?: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  noteEdited: boolean;
  mode?: "stopwatch" | "timer";
  plannedDurationMs?: number;
  quote?: { id: string; text: string; author?: string };
}

export function newSession(overrides: Partial<SeedSession> = {}): SeedSession {
  const now = new Date().toISOString();
  return {
    id: `session-${Math.random().toString(36).slice(2)}`,
    practiceId: "practice-seed",
    practiceNameSnapshot: "Deep work",
    durationMs: 25 * 60_000,
    completed: true,
    startedAt: now,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
    noteEdited: false,
    ...overrides,
  };
}

/** Seeds a finished proof entry directly (bypassing Timer/Stopwatch/Log
 *  Session UI) — for tests that only care about how the Book displays and
 *  shares an already-saved entry. */
export async function seedSession(page: Page, overrides: Partial<SeedSession> = {}): Promise<SeedSession> {
  const session = newSession(overrides);
  await seedRecord(page, "sessions", session);
  return session;
}

export async function readSessions(page: Page): Promise<any[]> {
  return page.evaluate(
    ({ DB_NAME, DB_VERSION }) => {
      return new Promise<any[]>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("sessions", "readonly");
          const getAllReq = tx.objectStore("sessions").getAll();
          getAllReq.onsuccess = () => resolve(getAllReq.result);
          getAllReq.onerror = () => reject(getAllReq.error);
        };
        req.onerror = () => reject(req.error);
      });
    },
    { DB_NAME, DB_VERSION }
  );
}
