import { STORES, idbDelete, idbGet, idbGetAll, idbPut, idbPutMany } from "@/lib/db";
import { EvidenceType, Practice, isPracticeRecord, newId, nowIso } from "@/lib/types";

export interface PracticeInput {
  name: string;
  description?: string;
  evidenceTypes: EvidenceType[];
  measurementUnit?: string;
}

export async function listPractices(): Promise<Practice[]> {
  const all = await idbGetAll<unknown>(STORES.practices);
  // Records from older builds that don't match the current shape are ignored
  // (never deleted) so leftover data can't crash the app.
  return all
    .filter(isPracticeRecord)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function listActivePractices(): Promise<Practice[]> {
  return (await listPractices()).filter((p) => !p.archived);
}

export async function getPractice(id: string): Promise<Practice | undefined> {
  const rec = await idbGet<unknown>(STORES.practices, id);
  return isPracticeRecord(rec) ? rec : undefined;
}

export async function createPractice(input: PracticeInput): Promise<Practice> {
  const existing = await listPractices();
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.order), -1);
  const practice: Practice = {
    id: newId(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    evidenceTypes: normalizeEvidence(input.evidenceTypes),
    measurementUnit: input.measurementUnit?.trim() || undefined,
    archived: false,
    order: maxOrder + 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await idbPut(STORES.practices, practice);
  return practice;
}

export async function updatePractice(id: string, input: Partial<PracticeInput> & { archived?: boolean }): Promise<Practice | undefined> {
  const p = await getPractice(id);
  if (!p) return undefined;
  const next: Practice = {
    ...p,
    name: input.name !== undefined ? input.name.trim() : p.name,
    description: input.description !== undefined ? input.description.trim() || undefined : p.description,
    evidenceTypes: input.evidenceTypes !== undefined ? normalizeEvidence(input.evidenceTypes) : p.evidenceTypes,
    measurementUnit: input.measurementUnit !== undefined ? input.measurementUnit.trim() || undefined : p.measurementUnit,
    archived: input.archived !== undefined ? input.archived : p.archived,
    updatedAt: nowIso(),
  };
  await idbPut(STORES.practices, next);
  return next;
}

/** Deleting a practice never touches sessions: proof stays intact via practiceNameSnapshot. */
export async function deletePractice(id: string): Promise<void> {
  await idbDelete(STORES.practices, id);
}

export async function movePractice(id: string, direction: -1 | 1): Promise<void> {
  const list = await listActivePractices();
  const idx = list.findIndex((p) => p.id === id);
  const swapWith = idx + direction;
  if (idx === -1 || swapWith < 0 || swapWith >= list.length) return;
  const a = list[idx];
  const b = list[swapWith];
  const t = a.order;
  a.order = b.order;
  b.order = t;
  a.updatedAt = nowIso();
  b.updatedAt = nowIso();
  await idbPutMany(STORES.practices, [a, b]);
}

function normalizeEvidence(types: EvidenceType[]): EvidenceType[] {
  const order: EvidenceType[] = ["timer", "notes", "measurement"];
  const set = new Set(types);
  if (set.size === 0) set.add("timer");
  return order.filter((t) => set.has(t));
}
