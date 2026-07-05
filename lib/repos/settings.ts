import { STORES, idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/db";
import { ActiveSession, SettingRecord, ThemePreference, isActiveSessionRecord } from "@/lib/types";

export const SETTING_KEYS = {
  theme: "theme",
  focusPracticeId: "focusPracticeId",
  activeSession: "activeSession",
} as const;

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const rec = await idbGet<SettingRecord>(STORES.settings, key);
  return rec?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await idbPut<SettingRecord>(STORES.settings, { key, value });
}

export async function deleteSetting(key: string): Promise<void> {
  await idbDelete(STORES.settings, key);
}

export async function listSettings(): Promise<SettingRecord[]> {
  return idbGetAll<SettingRecord>(STORES.settings);
}

// ---------- Theme ----------

export async function getThemePreference(): Promise<ThemePreference> {
  return (await getSetting<ThemePreference>(SETTING_KEYS.theme)) ?? "auto";
}

export async function setThemePreference(pref: ThemePreference): Promise<void> {
  await setSetting(SETTING_KEYS.theme, pref);
  // Mirror for flash-free first paint only; IndexedDB remains the source of truth.
  try {
    localStorage.setItem("dp-theme-mirror", pref);
  } catch {
    /* private mode etc. */
  }
}

// ---------- Focus practice ----------

export async function getFocusPracticeId(): Promise<string | undefined> {
  return getSetting<string>(SETTING_KEYS.focusPracticeId);
}

export async function setFocusPracticeId(id: string | undefined): Promise<void> {
  if (id === undefined) await deleteSetting(SETTING_KEYS.focusPracticeId);
  else await setSetting(SETTING_KEYS.focusPracticeId, id);
}

// ---------- Active session (refresh-safe) ----------

export async function getActiveSession(): Promise<ActiveSession | undefined> {
  const rec = await getSetting<unknown>(SETTING_KEYS.activeSession);
  // A malformed value from an older build is treated as no session.
  return isActiveSessionRecord(rec) ? rec : undefined;
}

export async function setActiveSession(session: ActiveSession): Promise<void> {
  await setSetting(SETTING_KEYS.activeSession, session);
}

export async function clearActiveSession(): Promise<void> {
  await deleteSetting(SETTING_KEYS.activeSession);
}

/** Elapsed milliseconds for an active session, computed from wall clock. */
export function elapsedMs(session: ActiveSession, now: number = Date.now()): number {
  if (session.status === "finishing" && session.finishedElapsedMs !== undefined) {
    return session.finishedElapsedMs;
  }
  const banked = session.accumulatedMs;
  if (session.status === "running" && session.lastResumedAt) {
    return banked + Math.max(0, now - new Date(session.lastResumedAt).getTime());
  }
  return banked;
}
