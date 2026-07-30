"use client";

import { useEffect, useRef, useState } from "react";
import { AccessRole, AccessState, BackupFile, BackupPreview, ThemePreference } from "@/lib/types";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";
import {
  BackupValidationError,
  ImportMode,
  downloadBackup,
  parseBackup,
  previewBackup,
  restoreBackup,
} from "@/lib/backup";
import { getAccessState, planLabel, roleLabel, setAccessRole } from "@/lib/repos/access";
import { AccessCodeForm } from "@/components/AccessCodeForm";
import { RestoreAccessForm } from "@/components/RestoreAccessForm";
import { BETA_MODE } from "@/lib/site";
import { STORES, idbClear } from "@/lib/db";
import { clearActiveSession, getSoundEnabled, recordBackupTaken, setSoundEnabled } from "@/lib/repos/settings";
import { createPractice } from "@/lib/repos/practices";
import { saveProof } from "@/lib/repos/sessions";

const isDev = process.env.NODE_ENV === "development";
const THEMES: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "day", label: "Day", hint: "Warm morning light" },
  { value: "night", label: "Night", hint: "Deep, peaceful evening" },
  { value: "auto", label: "Auto", hint: "Day 6am–6pm, night otherwise" },
];

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [access, setAccess] = useState<AccessState | null>(null);
  const [pending, setPending] = useState<{ backup: BackupFile; preview: BackupPreview } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    getAccessState().then(setAccess);
    getSoundEnabled().then(setSoundEnabledState);
  }, []);

  async function toggleSound(enabled: boolean) {
    setSoundEnabledState(enabled);
    await setSoundEnabled(enabled);
  }

  // ---------- Backup ----------

  async function exportBackup() {
    await downloadBackup();
    await recordBackupTaken();
    toast("Backup exported");
  }

  async function onFileChosen(file: File | undefined) {
    setImportError(null);
    if (!file) return;
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      setPending({ backup, preview: previewBackup(backup) });
    } catch (err) {
      if (err instanceof BackupValidationError) setImportError(err.message);
      else setImportError("The file could not be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function doImport(mode: ImportMode) {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending.backup, mode);
      setPending(null);
      toast(mode === "replace" ? "Backup restored" : "Backup merged");
      // Theme or other settings may have changed with the import.
      setTimeout(() => window.location.reload(), 600);
    } catch {
      setImportError("Import failed. Your existing data was not changed.");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Dev tools ----------

  async function devResetAll() {
    if (!window.confirm("Development reset: delete ALL local data?")) return;
    await clearActiveSession();
    await Promise.all([
      idbClear(STORES.practices),
      idbClear(STORES.sessions),
      idbClear(STORES.settings),
      idbClear(STORES.access),
    ]);
    toast("All data cleared");
    setTimeout(() => window.location.reload(), 600);
  }

  async function devSeed() {
    const p = await createPractice({
      name: "Deep work",
      description: "Uninterrupted, meaningful work",
      evidenceTypes: ["timer", "notes", "measurement"],
      measurementUnit: "pages",
    });
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      const start = new Date(now - i * 86_400_000 - 3_600_000);
      const end = new Date(start.getTime() + 32 * 60_000);
      await saveProof({
        practiceId: p.id,
        practiceNameSnapshot: p.name,
        durationMs: 32 * 60_000,
        completed: i !== 1,
        measurement: 4 + i,
        measurementUnit: "pages",
        notes: i === 0 ? "Found the thread again after lunch. Kept going." : undefined,
        startedAt: start.toISOString(),
        completedAt: end.toISOString(),
      });
    }
    toast("Seed data created");
  }

  async function devSetRole(role: AccessRole) {
    const next = await setAccessRole(role);
    setAccess(next);
    toast(`Role: ${roleLabel(role)}`);
  }

  // ---------- Access code ----------
  const [portalBusy, setPortalBusy] = useState(false);

  // Stripe-derived Premium (activated via checkout) has a signed token but
  // no locally-stored customer id — the billing-portal endpoint derives the
  // customer from that token's verified subscription instead, so the
  // browser never needs to hold or send one.
  const stripePremiumToken =
    access?.role === "premium" && access.license?.token ? access.license.token : null;
  const canManageBilling = stripePremiumToken !== null;

  async function openBillingPortal() {
    if (portalBusy || !stripePremiumToken) return;
    setPortalBusy(true);
    try {
      const res = await fetch("/api/access/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: stripePremiumToken }),
      });
      const data = await res.json();
      if (res.ok && data.url) window.location.assign(data.url);
      else toast("Billing portal isn't available right now");
    } catch {
      toast("Billing portal isn't available right now");
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    // Desktop lays the setting cards out in two columns; below lg the
    // original single column (space-y) is untouched.
    <div className="space-y-9 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-10 lg:space-y-0">
      <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl lg:col-span-2">
        Settings
      </h1>

      {/* ---------- Appearance ---------- */}
      <section aria-labelledby="s-appearance">
        <h2 id="s-appearance" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Appearance
        </h2>
        <div className="card mt-2.5 grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = preference === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setPreference(t.value)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-ember/70 bg-ember/5" : "border-line hover:border-line-strong"
                }`}
              >
                <span className="block text-[15px] font-medium">{t.label}</span>
                <span className="block text-[13px] text-ink-faint">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- Focus ---------- */}
      <section aria-labelledby="s-focus">
        <h2 id="s-focus" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Focus
        </h2>
        <div className="card mt-2.5 flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[15px] font-medium">Completion sound</p>
            <p className="mt-0.5 text-[13.5px] text-ink-soft">Plays once when a Timer session reaches zero.</p>
          </div>
          <div className="inline-flex shrink-0 rounded-xl border border-line p-1">
            {[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                aria-pressed={soundEnabled === opt.value}
                onClick={() => toggleSound(opt.value)}
                className={`rounded-lg px-3.5 py-1.5 text-[14px] font-medium transition-colors ${
                  soundEnabled === opt.value ? "bg-surface2 text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Access ---------- */}
      <section aria-labelledby="s-access">
        <h2 id="s-access" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Access
        </h2>
        <div className="card mt-2.5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium">Current plan</p>
              <p className="mt-0.5 text-[13.5px] text-ink-soft">
                {access ? planLabel(access) : "…"}
                {access?.license?.expiresAt &&
                  ` · until ${new Date(access.license.expiresAt).toLocaleDateString()}`}
              </p>
            </div>
            {canManageBilling && (
              <button className="btn-quiet shrink-0" onClick={openBillingPortal} disabled={portalBusy}>
                {portalBusy ? "Opening…" : "Manage subscription"}
              </button>
            )}
          </div>
          {canManageBilling && (
            <p className="mt-2 text-[12.5px] text-ink-faint">
              Opens Stripe&rsquo;s secure billing portal, where you can cancel your subscription,
              update your payment method, or view billing history — no need to contact support.
            </p>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <label htmlFor="s-code" className="text-[13.5px] font-medium text-ink-soft">
              Have an access code?
            </label>
            <div className="mt-2">
              <AccessCodeForm
                onSuccess={(next, roleName) => {
                  setAccess(next);
                  toast(`Access updated: ${roleName}`);
                }}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-faint">
              Entering a new code replaces your current one. No account needed — the code is your key.
            </p>
          </div>
          {!BETA_MODE && (
            <div className="mt-4 border-t border-line pt-4">
              {showRestore ? (
                <RestoreAccessForm onClose={() => setShowRestore(false)} />
              ) : (
                <button
                  className="text-[13px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
                  onClick={() => setShowRestore(true)}
                >
                  Bought Premium on another device? Restore access
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Backup ---------- */}
      <section aria-labelledby="s-backup">
        <h2 id="s-backup" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Backup
        </h2>
        <div className="card mt-2.5 p-5">
          <p className="text-[14px] text-ink-soft">
            Everything lives in this browser&rsquo;s local storage — there is no cloud backup, on
            any plan. A backup is a single JSON file with your practices, proof, and settings;
            exporting one is the only copy that exists anywhere else.
          </p>
          <p className="mt-2 text-[13px] text-ink-faint">
            A browser can clear local storage without warning — low disk space, private
            browsing, an uninstall — and without a recent export, that proof can&rsquo;t be
            recovered. Import brings a backup onto a new device or browser.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-quiet" onClick={exportBackup}>
              Export backup
            </button>
            <button className="btn-quiet" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onFileChosen(e.target.files?.[0])}
            />
          </div>
          {importError && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13.5px] text-red-500">
              Import failed: {importError}
            </p>
          )}
        </div>
      </section>

      {/* ---------- Privacy ---------- */}
      <section aria-labelledby="s-privacy">
        <h2 id="s-privacy" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Privacy
        </h2>
        <div className="card mt-2.5 p-5">
          <p className="text-[15px]">Your proof never leaves this device.</p>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Everything is stored locally in your browser. There is no account, no server, and no
            tracking. The only copy that exists elsewhere is the one you export yourself.
          </p>
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section aria-labelledby="s-about">
        <h2 id="s-about" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          About
        </h2>
        <div className="card mt-2.5 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-lg font-semibold">
              <span className="wordmark-daily">Daily</span> Proof<span className="wordmark-dot">.</span>
            </p>
          </div>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            Collect proof of meaningful work. Not streaks, not points — proof.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[13px] text-ink-faint">
            <span>Version 1.0.0</span>
            {access && <span>{roleLabel(access.role)}</span>}
          </div>
          {access?.role === "free" && (
            <a href="/upgrade" className="btn-quiet mt-4 block w-full text-center sm:w-auto sm:px-6">
              Upgrade
            </a>
          )}
        </div>
      </section>

      {/* ---------- Developer (development builds only) ----------
          Deliberately quieter than the real settings: dashed hairline, tinted
          background, smaller heading. It should read as an advanced area. */}
      {isDev && (
        <section aria-labelledby="s-dev" className="lg:col-span-2">
          <h2
            id="s-dev"
            className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint/80"
          >
            Developer
          </h2>
          <div className="mt-2.5 space-y-4 rounded-2xl border border-dashed border-line/70 bg-surface2/40 p-4">
            <div>
              <p className="text-sm font-medium text-ink-soft">Access role</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["owner", "lifetime", "premium", "free"] as AccessRole[]).map((r) => (
                  <button
                    key={r}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      access?.role === r ? "border-ember/70 bg-ember/10" : "border-line"
                    }`}
                    onClick={() => devSetRole(r)}
                  >
                    {roleLabel(r)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-quiet" onClick={devSeed}>
                Seed sample data
              </button>
              <button className="btn-quiet text-red-500" onClick={devResetAll}>
                Reset all data
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ---------- Import preview dialog ---------- */}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Import backup"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && setPending(null)}
        >
          <div className="card w-full max-w-sm p-6">
            <h2 className="font-display text-xl font-semibold">Restore this backup?</h2>
            <dl className="mt-4 space-y-1.5 text-[14.5px]">
              <Row label="Created" value={new Date(pending.preview.createdAt).toLocaleString()} />
              <Row label="Practices" value={String(pending.preview.practicesCount)} />
              <Row label="Proof entries" value={String(pending.preview.sessionsCount)} />
              <Row label="Settings" value={String(pending.preview.settingsCount)} />
            </dl>
            <p className="mt-4 text-[13.5px] text-ink-soft">
              <strong>Merge</strong> adds the backup to what you have. <strong>Replace</strong>{" "}
              deletes current data first. Any in-progress session is cleared either way.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button className="btn-primary" disabled={busy} onClick={() => doImport("merge")}>
                Merge into current data
              </button>
              <button className="btn-quiet" disabled={busy} onClick={() => doImport("replace")}>
                Replace current data
              </button>
              <button className="btn-ghost" disabled={busy} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
