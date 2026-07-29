// ---------- Practices ----------

export type EvidenceType = "timer" | "notes" | "measurement";

export interface Practice {
  id: string;
  name: string;
  description?: string;
  evidenceTypes: EvidenceType[];
  measurementUnit?: string;
  archived: boolean;
  order: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ---------- Sessions (proof entries) ----------

export type SessionMode = "stopwatch" | "timer";

export interface SessionEntry {
  id: string;
  practiceId: string; // may point to a deleted practice; snapshot below keeps proof intact
  practiceNameSnapshot: string;
  durationMs: number;
  completed: boolean;
  measurement?: number;
  measurementUnit?: string;
  notes?: string;
  startedAt: string; // ISO
  completedAt: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  noteEdited: boolean;
  /** Absent = Stopwatch (also true of every session saved before Timer
   *  mode existed — treated as Stopwatch, never migrated). */
  mode?: SessionMode;
  /** Only present when mode is "timer": the duration chosen at setup.
   *  durationMs remains the actual proof; overtime (if any) is
   *  durationMs − plannedDurationMs, computed on demand, never stored. */
  plannedDurationMs?: number;
}

// ---------- Active session (survives refresh) ----------

export interface ActiveSession {
  practiceId: string;
  practiceNameSnapshot: string;
  startedAt: string; // ISO, wall-clock start
  accumulatedMs: number; // time banked before the latest resume
  lastResumedAt: string | null; // ISO when running, null when paused
  status: "running" | "paused" | "finishing";
  finishedElapsedMs?: number; // frozen elapsed once Finish is pressed
  /** Absent = Stopwatch. Everything below only ever applies to "timer". */
  mode?: SessionMode;
  plannedDurationMs?: number;
  /** True once the completion sound has fired for this session's zero
   *  crossing — persisted so a refresh right after zero can't replay it. */
  completionSoundPlayed?: boolean;
  /** True once the user chooses "Continue working" past zero. While this
   *  is false and elapsed >= plannedDurationMs, Focus shows the completion
   *  prompt (on every render, including after a refresh — that's correct:
   *  the decision hasn't been made yet). Once true, Focus shows overtime
   *  counting up, using the exact same accumulation math as Stopwatch. */
  continuedPastPlanned?: boolean;
}

// ---------- Settings ----------

export type ThemePreference = "day" | "night" | "auto";

export interface SettingRecord {
  key: string;
  value: unknown;
}

// ---------- Access model (foundation only, no billing wired) ----------

export type AccessRole = "owner" | "lifetime" | "premium" | "beta" | "free";

export interface StoredLicense {
  code: string;
  role: AccessRole;
  expiresAt: string | null; // ISO, null = never
  validatedAt: string; // ISO
  /** Present only for Stripe-activated licenses (premium/lifetime): the
   *  opaque signed token returned by /api/checkout/activate or
   *  /api/access/refresh. Re-sent verbatim to refresh premium access —
   *  never parsed or trusted client-side. Manual codes never set this. */
  token?: string;
}

export interface AccessState {
  key: "access"; // singleton
  role: AccessRole;
  license?: StoredLicense; // present after redeeming an access code
  updatedAt: string;
}

// ---------- Backup ----------

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  app: "daily-proof";
  formatVersion: number;
  createdAt: string; // ISO
  practices: Practice[];
  sessions: SessionEntry[];
  settings: SettingRecord[];
  access: AccessState | null;
}

export interface BackupPreview {
  createdAt: string;
  practicesCount: number;
  sessionsCount: number;
  settingsCount: number;
}

// ---------- Helpers ----------

/** True when a stored record matches the current Practice shape. Databases
 *  left by older builds can hold records with the same store name but a
 *  different shape; those are ignored on read, never deleted. */
export function isPracticeRecord(v: unknown): v is Practice {
  const p = v as Practice;
  return (
    !!p &&
    typeof p === "object" &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    Array.isArray(p.evidenceTypes) &&
    typeof p.archived === "boolean" &&
    typeof p.order === "number" &&
    typeof p.createdAt === "string" &&
    typeof p.updatedAt === "string"
  );
}

/** True when a stored record matches the current SessionEntry shape. */
export function isSessionRecord(v: unknown): v is SessionEntry {
  const s = v as SessionEntry;
  return (
    !!s &&
    typeof s === "object" &&
    typeof s.id === "string" &&
    typeof s.practiceNameSnapshot === "string" &&
    typeof s.durationMs === "number" &&
    typeof s.completed === "boolean" &&
    typeof s.startedAt === "string" &&
    typeof s.completedAt === "string" &&
    typeof s.createdAt === "string" &&
    typeof s.updatedAt === "string"
  );
}

/** True when a stored value matches the current ActiveSession shape. */
export function isActiveSessionRecord(v: unknown): v is ActiveSession {
  const s = v as ActiveSession;
  return (
    !!s &&
    typeof s === "object" &&
    typeof s.practiceId === "string" &&
    typeof s.practiceNameSnapshot === "string" &&
    typeof s.startedAt === "string" &&
    typeof s.accumulatedMs === "number" &&
    (s.status === "running" || s.status === "paused" || s.status === "finishing")
  );
}

/** True when a stored record matches the current AccessState shape. */
export function isAccessRecord(v: unknown): v is AccessState {
  const a = v as AccessState;
  return (
    !!a &&
    typeof a === "object" &&
    a.key === "access" &&
    (a.role === "owner" || a.role === "lifetime" || a.role === "premium" || a.role === "beta" || a.role === "free")
  );
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
