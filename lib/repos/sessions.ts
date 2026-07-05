import { STORES, idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/db";
import { SessionEntry, isSessionRecord, newId, nowIso } from "@/lib/types";

export interface SaveProofInput {
  practiceId: string;
  practiceNameSnapshot: string;
  durationMs: number;
  completed: boolean;
  measurement?: number;
  measurementUnit?: string;
  notes?: string;
  startedAt: string;
  completedAt: string;
}

export async function saveProof(input: SaveProofInput): Promise<SessionEntry> {
  const entry: SessionEntry = {
    id: newId(),
    practiceId: input.practiceId,
    practiceNameSnapshot: input.practiceNameSnapshot,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    completed: input.completed,
    measurement: input.measurement,
    measurementUnit: input.measurementUnit,
    notes: input.notes?.trim() || undefined,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    noteEdited: false,
  };
  await idbPut(STORES.sessions, entry);
  return entry;
}

export async function listSessions(): Promise<SessionEntry[]> {
  const all = await idbGetAll<unknown>(STORES.sessions);
  // Ignore (never delete) records left by older builds with a different shape.
  return all.filter(isSessionRecord);
}

/** Local-day key like "2026-07-03" from an ISO timestamp. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Entries for a local day, ordered by completion time. Order never changes on note edit. */
export async function listSessionsForDay(date: Date): Promise<SessionEntry[]> {
  const key = dayKeyOf(date);
  const all = await listSessions();
  return all
    .filter((s) => localDayKey(s.completedAt) === key)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.createdAt.localeCompare(b.createdAt));
}

export async function getSession(id: string): Promise<SessionEntry | undefined> {
  const rec = await idbGet<unknown>(STORES.sessions, id);
  return isSessionRecord(rec) ? rec : undefined;
}

/** Only notes are editable. Everything else is immutable proof. */
export async function editSessionNote(id: string, notes: string): Promise<SessionEntry | undefined> {
  const s = await getSession(id);
  if (!s) return undefined;
  const trimmed = notes.trim();
  const nextNotes = trimmed === "" ? undefined : trimmed;
  if (nextNotes === s.notes) return s; // no change, no flag
  const next: SessionEntry = { ...s, notes: nextNotes, updatedAt: nowIso(), noteEdited: true };
  await idbPut(STORES.sessions, next);
  return next;
}

/** Permanently deletes a proof entry. Callers must confirm with the user first. */
export async function deleteSession(id: string): Promise<void> {
  await idbDelete(STORES.sessions, id);
}
