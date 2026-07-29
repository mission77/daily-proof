"use client";

import { useEffect, useState } from "react";
import { downloadBackup, shouldRemindBackup } from "@/lib/backup";
import { listSessions } from "@/lib/repos/sessions";
import {
  dismissBackupReminder,
  getBackupReminderDismissedAt,
  getLastBackupAt,
  recordBackupTaken,
} from "@/lib/repos/settings";
import { useToast } from "@/components/Toast";

/** A calm, rare nudge — never a nag: proof lives only on this device, and
 *  platforms like iOS Safari can quietly evict it after enough inactivity.
 *  Shows at most once every 30 days, and only once there is real,
 *  unprotected proof to back up (see lib/backup.ts for the exact trigger). */
export function BackupReminder() {
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sessions, lastBackupAt, dismissedAt] = await Promise.all([
        listSessions(),
        getLastBackupAt(),
        getBackupReminderDismissedAt(),
      ]);
      if (!cancelled) setVisible(shouldRemindBackup(sessions, lastBackupAt, dismissedAt));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function exportNow() {
    setBusy(true);
    try {
      await downloadBackup();
      await recordBackupTaken();
      setVisible(false);
      toast("Backup exported");
    } finally {
      setBusy(false);
    }
  }

  async function dismiss() {
    await dismissBackupReminder();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-[14px] leading-relaxed text-ink-soft">
        Your proof lives only on this device — worth a quick backup.
      </p>
      <div className="flex shrink-0 gap-2">
        <button className="btn-quiet" onClick={exportNow} disabled={busy}>
          {busy ? "Exporting…" : "Export backup"}
        </button>
        <button className="btn-ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
