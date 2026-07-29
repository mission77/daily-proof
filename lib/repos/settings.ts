import { STORES, idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/db";
import { ActiveSession, SessionMode, SettingRecord, ThemePreference, isActiveSessionRecord } from "@/lib/types";

export const SETTING_KEYS = {
  theme: "theme",
  focusPracticeId: "focusPracticeId",
  activeSession: "activeSession",
  lastBackupAt: "lastBackupAt",
  backupReminderDismissedAt: "backupReminderDismissedAt",
  lastSessionMode: "lastSessionMode",
  lastTimerDurationMs: "lastTimerDurationMs",
  soundEnabled: "soundEnabled",
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

// ---------- Backup reminder (local-only nudge, never sent anywhere) ----------

export async function getLastBackupAt(): Promise<string | undefined> {
  return getSetting<string>(SETTING_KEYS.lastBackupAt);
}

export async function recordBackupTaken(): Promise<void> {
  await setSetting(SETTING_KEYS.lastBackupAt, new Date().toISOString());
}

export async function getBackupReminderDismissedAt(): Promise<string | undefined> {
  return getSetting<string>(SETTING_KEYS.backupReminderDismissedAt);
}

export async function dismissBackupReminder(): Promise<void> {
  await setSetting(SETTING_KEYS.backupReminderDismissedAt, new Date().toISOString());
}

// ---------- Session mode memory ----------
// Purely a convenience default for the Start Session choice — never hides
// the choice itself, which stays visible and changeable every time.

export async function getLastSessionMode(): Promise<SessionMode> {
  return (await getSetting<SessionMode>(SETTING_KEYS.lastSessionMode)) ?? "stopwatch";
}

export async function setLastSessionMode(mode: SessionMode): Promise<void> {
  await setSetting(SETTING_KEYS.lastSessionMode, mode);
}

export async function getLastTimerDurationMs(): Promise<number | undefined> {
  return getSetting<number>(SETTING_KEYS.lastTimerDurationMs);
}

export async function setLastTimerDurationMs(ms: number): Promise<void> {
  await setSetting(SETTING_KEYS.lastTimerDurationMs, ms);
}

// ---------- Completion sound preference ----------

export async function getSoundEnabled(): Promise<boolean> {
  return (await getSetting<boolean>(SETTING_KEYS.soundEnabled)) ?? true;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  await setSetting(SETTING_KEYS.soundEnabled, enabled);
}

/** Elapsed milliseconds for an active session, computed from wall clock —
 *  never from a running interval — so a refresh, crash, closed laptop lid,
 *  backgrounded tab, or a PWA the OS fully suspends all recover the correct
 *  value the moment `now` is read again: `accumulatedMs` plus the gap since
 *  `lastResumedAt`, however large that gap turns out to have been.
 *
 *  Deliberately: real wall-clock time elapses even while the device is
 *  asleep or the app is fully suspended. This was already true of Stopwatch
 *  before Timer existed (a session left running overnight reports the full
 *  overnight duration) and Timer reuses the exact same accumulation, so a
 *  Timer left running through a sleep can already be at or past zero the
 *  moment it's reopened — Focus shows "Time complete" immediately on
 *  return in that case, having never claimed the completion sound played
 *  while nothing was on screen to play it. Pausing before sleeping is how a
 *  session avoids counting that time; there is no separate "idle detection"
 *  that pauses it automatically, on either mode, and none is planned — that
 *  would be a philosophy change, not a bug fix. */
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
