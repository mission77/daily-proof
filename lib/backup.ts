import { STORES, idbPut, idbPutMany, idbReplaceAll } from "@/lib/db";
import { clearActiveSession, listSettings } from "@/lib/repos/settings";
import { getAccessState } from "@/lib/repos/access";
import { listPractices } from "@/lib/repos/practices";
import { listSessions } from "@/lib/repos/sessions";
import {
  AccessState,
  BACKUP_FORMAT_VERSION,
  BackupFile,
  BackupPreview,
  Practice,
  SessionEntry,
  SettingRecord,
  nowIso,
} from "@/lib/types";

// ---------- Export ----------

export async function buildBackup(): Promise<BackupFile> {
  // Repos filter out malformed records from older builds, so exported
  // backups always match the schema they'll be validated against on import.
  const [practices, sessions, settings, access] = await Promise.all([
    listPractices(),
    listSessions(),
    listSettings(),
    getAccessState(),
  ]);
  // The in-progress session is transient state, not proof. Never export it.
  const exportableSettings = settings.filter((s) => s.key !== "activeSession");
  return {
    app: "daily-proof",
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: nowIso(),
    practices,
    sessions,
    settings: exportableSettings,
    access,
  };
}

export function backupFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `daily-proof-backup-${y}-${m}-${d}.json`;
}

// ---------- Validation ----------

export class BackupValidationError extends Error {}

const EVIDENCE = new Set(["timer", "notes", "measurement"]);
const ROLES = new Set(["owner", "lifetime", "premium", "free"]);

function fail(reason: string): never {
  throw new BackupValidationError(reason);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIso(v: unknown): boolean {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("The file is not valid JSON.");
  }
  if (!isRecord(raw)) fail("The file does not contain a JSON object.");
  if (raw.app !== "daily-proof") fail('Missing or wrong "app" field — this is not a Daily Proof backup.');
  if (typeof raw.formatVersion !== "number") fail('Missing "formatVersion" field.');
  if (raw.formatVersion > BACKUP_FORMAT_VERSION) {
    fail(`Backup format version ${raw.formatVersion} is newer than this app supports (${BACKUP_FORMAT_VERSION}). Update the app first.`);
  }
  if (!isIso(raw.createdAt)) fail('Missing or invalid "createdAt" timestamp.');
  if (!Array.isArray(raw.practices)) fail('"practices" must be an array.');
  if (!Array.isArray(raw.sessions)) fail('"sessions" must be an array.');
  if (!Array.isArray(raw.settings)) fail('"settings" must be an array.');

  raw.practices.forEach((p, i) => validatePractice(p, i));
  raw.sessions.forEach((s, i) => validateSession(s, i));
  raw.settings.forEach((s, i) => {
    if (!isRecord(s) || typeof s.key !== "string") fail(`Setting #${i + 1} is missing a string "key".`);
  });
  if (raw.access !== null && raw.access !== undefined) validateAccess(raw.access);

  const ids = new Set<string>();
  for (const p of raw.practices as Practice[]) {
    if (ids.has(p.id)) fail(`Duplicate practice id "${p.id}".`);
    ids.add(p.id);
  }
  const sids = new Set<string>();
  for (const s of raw.sessions as SessionEntry[]) {
    if (sids.has(s.id)) fail(`Duplicate session id "${s.id}".`);
    sids.add(s.id);
  }

  return raw as unknown as BackupFile;
}

function validatePractice(p: unknown, i: number): void {
  const at = `Practice #${i + 1}`;
  if (!isRecord(p)) fail(`${at} is not an object.`);
  if (typeof p.id !== "string" || p.id === "") fail(`${at} is missing a string "id".`);
  if (typeof p.name !== "string" || p.name.trim() === "") fail(`${at} is missing a non-empty "name".`);
  if (!Array.isArray(p.evidenceTypes) || p.evidenceTypes.some((t) => !EVIDENCE.has(t as string))) {
    fail(`${at} has an invalid "evidenceTypes" list (allowed: timer, notes, measurement).`);
  }
  if (typeof p.archived !== "boolean") fail(`${at} is missing a boolean "archived".`);
  if (typeof p.order !== "number") fail(`${at} is missing a numeric "order".`);
  if (!isIso(p.createdAt)) fail(`${at} has an invalid "createdAt".`);
  if (!isIso(p.updatedAt)) fail(`${at} has an invalid "updatedAt".`);
}

function validateSession(s: unknown, i: number): void {
  const at = `Session #${i + 1}`;
  if (!isRecord(s)) fail(`${at} is not an object.`);
  if (typeof s.id !== "string" || s.id === "") fail(`${at} is missing a string "id".`);
  if (typeof s.practiceId !== "string") fail(`${at} is missing "practiceId".`);
  if (typeof s.practiceNameSnapshot !== "string" || s.practiceNameSnapshot === "") {
    fail(`${at} is missing "practiceNameSnapshot".`);
  }
  if (typeof s.durationMs !== "number" || s.durationMs < 0) fail(`${at} has an invalid "durationMs".`);
  if (typeof s.completed !== "boolean") fail(`${at} is missing a boolean "completed".`);
  if (s.measurement !== undefined && typeof s.measurement !== "number") fail(`${at} has a non-numeric "measurement".`);
  if (typeof s.noteEdited !== "boolean") fail(`${at} is missing a boolean "noteEdited".`);
  for (const k of ["startedAt", "completedAt", "createdAt", "updatedAt"] as const) {
    if (!isIso(s[k])) fail(`${at} has an invalid "${k}".`);
  }
}

function validateAccess(a: unknown): void {
  if (!isRecord(a)) fail('"access" is not an object.');
  if (!ROLES.has(a.role as string)) fail('"access.role" must be one of: owner, lifetime, premium, free.');
}

export function previewBackup(b: BackupFile): BackupPreview {
  return {
    createdAt: b.createdAt,
    practicesCount: b.practices.length,
    sessionsCount: b.sessions.length,
    settingsCount: b.settings.length,
  };
}

// ---------- Restore ----------

export type ImportMode = "merge" | "replace";

/**
 * Restore a validated backup.
 * - replace: wipes practices/sessions/settings and writes the backup, atomically.
 * - merge: adds/overwrites by id/key; nothing existing is deleted.
 * Either way, any in-progress session is cleared first: its practice or timing
 * context may no longer exist after the data changes.
 */
export async function restoreBackup(b: BackupFile, mode: ImportMode): Promise<void> {
  await clearActiveSession();

  const importableSettings = b.settings.filter((s) => s.key !== "activeSession");

  if (mode === "replace") {
    await idbReplaceAll({
      [STORES.practices]: b.practices,
      [STORES.sessions]: b.sessions,
      [STORES.settings]: importableSettings,
    });
  } else {
    await idbPutMany<Practice>(STORES.practices, b.practices);
    await idbPutMany<SessionEntry>(STORES.sessions, b.sessions);
    await idbPutMany<SettingRecord>(STORES.settings, importableSettings);
  }

  if (b.access) {
    const access: AccessState = { ...b.access, key: "access" };
    await idbPut(STORES.access, access);
  }
}
