"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActiveSession, Practice, SessionEntry, nowIso } from "@/lib/types";
import {
  clearActiveSession,
  elapsedMs,
  getActiveSession,
  setActiveSession,
} from "@/lib/repos/settings";
import { getPractice } from "@/lib/repos/practices";
import { saveProof } from "@/lib/repos/sessions";
import { pickQuote, type Quote } from "@/lib/quotes";
import { renderShareCard, shareCard } from "@/lib/sharecard";
import { FlipTimer } from "@/components/FlipTimer";
import { Wordmark } from "@/components/Wordmark";
import { useToast } from "@/components/Toast";

export default function FocusPage() {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<ActiveSession | null | undefined>(undefined);
  const [practice, setPractice] = useState<Practice | undefined>();
  const [now, setNow] = useState(() => Date.now());

  // Finish form state
  const [completed, setCompleted] = useState(true);
  const [measurement, setMeasurement] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // Proof-saved state (post save; the active session is already cleared)
  const [savedEntry, setSavedEntry] = useState<SessionEntry | null>(null);
  const [savedQuote, setSavedQuote] = useState<Quote | null>(null);
  const [sharing, setSharing] = useState(false);

  // Confirm dialog for cancelling the session
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Restore session on mount (survives refresh: elapsed derives from wall clock).
  useEffect(() => {
    let cancelled = false;
    getActiveSession().then(async (s) => {
      if (cancelled) return;
      if (!s) {
        setSession(null);
        return;
      }
      setSession(s);
      const p = await getPractice(s.practiceId);
      if (!cancelled) setPractice(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ticker
  useEffect(() => {
    if (!session || session.status !== "running") return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [session]);

  // Redirect only when there is truly nothing to show.
  useEffect(() => {
    if (session === null && !savedEntry) router.replace("/studio");
  }, [session, savedEntry, router]);

  const pause = useCallback(async () => {
    if (!session || session.status !== "running") return;
    const next: ActiveSession = {
      ...session,
      accumulatedMs: elapsedMs(session),
      lastResumedAt: null,
      status: "paused",
    };
    setSession(next);
    await setActiveSession(next);
  }, [session]);

  const resume = useCallback(async () => {
    if (!session || session.status !== "paused") return;
    const next: ActiveSession = {
      ...session,
      lastResumedAt: nowIso(),
      status: "running",
    };
    setSession(next);
    setNow(Date.now());
    await setActiveSession(next);
  }, [session]);

  /** Resets the timer to 00:00 immediately and keeps the session running. */
  const restart = useCallback(async () => {
    if (!session || session.status === "finishing") return;
    const next: ActiveSession = {
      ...session,
      startedAt: nowIso(),
      lastResumedAt: nowIso(),
      accumulatedMs: 0,
      status: "running",
    };
    setSession(next);
    setNow(Date.now());
    await setActiveSession(next);
  }, [session]);

  const finish = useCallback(async () => {
    if (!session || session.status === "finishing") return;
    const frozen = elapsedMs(session);
    const next: ActiveSession = {
      ...session,
      accumulatedMs: frozen,
      finishedElapsedMs: frozen,
      lastResumedAt: null,
      status: "finishing",
    };
    setSession(next);
    await setActiveSession(next); // finish state also survives refresh
  }, [session]);

  const evidence = practice?.evidenceTypes ?? ["timer"];
  const usesNotes = evidence.includes("notes");
  const usesMeasurement = evidence.includes("measurement");
  // Live name: edits to the practice propagate instantly; snapshot is a fallback.
  const liveName = practice?.name ?? session?.practiceNameSnapshot ?? "";

  async function handleSaveProof() {
    if (!session || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    const duration = session.finishedElapsedMs ?? elapsedMs(session);
    const measurementValue =
      usesMeasurement && measurement.trim() !== "" ? Number(measurement) : undefined;

    const entry = await saveProof({
      practiceId: session.practiceId,
      practiceNameSnapshot: liveName || session.practiceNameSnapshot,
      durationMs: duration,
      completed,
      measurement: Number.isFinite(measurementValue) ? measurementValue : undefined,
      measurementUnit: practice?.measurementUnit,
      notes: usesNotes ? notes : undefined,
      startedAt: session.startedAt,
      completedAt: nowIso(),
    });
    const quote = await pickQuote(entry.practiceNameSnapshot, practice?.description);
    await clearActiveSession();
    // Show the saved screen; the redirect effect stays quiet while savedEntry exists.
    setSavedEntry(entry);
    setSavedQuote(quote);
    setSession(null);
    setSaving(false);
    savingRef.current = false;
  }

  async function handleDiscard() {
    await clearActiveSession();
    setConfirmCancel(false);
    router.push("/studio");
  }

  async function handleShare() {
    if (!savedEntry || !savedQuote || sharing) return;
    setSharing(true);
    try {
      const blob = await renderShareCard({
        practiceName: savedEntry.practiceNameSnapshot,
        durationMs: savedEntry.durationMs,
        measurement: savedEntry.measurement,
        measurementUnit: savedEntry.measurementUnit,
        completedAt: savedEntry.completedAt,
        quote: savedQuote,
      });
      const result = await shareCard(blob, savedEntry.practiceNameSnapshot);
      if (result === "downloaded") toast("Share card saved as image");
    } catch {
      toast("Couldn't create the share card");
    } finally {
      setSharing(false);
    }
  }

  // ---------- Proof saved ----------
  if (savedEntry) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        <Wordmark className="text-lg" />
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-ember/10 text-ember-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Proof saved.</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          {savedEntry.practiceNameSnapshot} · {formatFinished(savedEntry.durationMs)}
        </p>
        {savedQuote && (
          <blockquote className="mx-auto mt-7 max-w-sm">
            <p className="font-display text-[17px] italic leading-relaxed text-ink-soft">
              &ldquo;{savedQuote.text}&rdquo;
            </p>
            {savedQuote.author && (
              <cite className="mt-1.5 block text-[13px] not-italic text-ink-faint">
                &mdash; {savedQuote.author}
              </cite>
            )}
          </blockquote>
        )}
        <div className="mt-9 flex w-full max-w-xs flex-col gap-3">
          <button className="btn-primary w-full" onClick={() => router.push("/book")}>
            Done
          </button>
          <button className="btn-quiet w-full" onClick={handleShare} disabled={sharing}>
            {sharing ? "Preparing card\u2026" : "Share today's proof"}
          </button>
        </div>
      </div>
    );
  }

  if (session === undefined || session === null) {
    return <div className="min-h-dvh bg-bg" />;
  }

  const elapsed = elapsedMs(session, now);

  // ---------- Finish screen ----------
  if (session.status === "finishing") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Session finished</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{liveName}</h1>
        <p className="mt-1 text-ink-soft tabular-nums">{formatFinished(elapsed)}</p>

        <div className="card mt-6 space-y-5 p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-soft">Completed what you intended?</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {[
                { v: true, label: "Yes" },
                { v: false, label: "Not quite" },
              ].map((o) => (
                <button
                  key={o.label}
                  role="radio"
                  aria-checked={completed === o.v}
                  onClick={() => setCompleted(o.v)}
                  className={`rounded-xl border px-4 py-2.5 text-[15px] font-medium transition-colors ${
                    completed === o.v
                      ? "border-ember/70 bg-ember/10 text-ink"
                      : "border-line text-ink-soft hover:border-line-strong"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          {usesMeasurement && (
            <div>
              <label htmlFor="f-measure" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Measurement{practice?.measurementUnit ? ` (${practice.measurementUnit})` : ""}
              </label>
              <input
                id="f-measure"
                className="field"
                inputMode="decimal"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {usesNotes && (
            <div>
              <label htmlFor="f-notes" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Notes
              </label>
              <textarea
                id="f-notes"
                className="field min-h-[96px] resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened in this session?"
              />
            </div>
          )}
        </div>

        <button className="btn-primary mt-5 w-full py-3.5 text-[16px]" onClick={handleSaveProof} disabled={saving}>
          {saving ? "Saving\u2026" : "Save proof"}
        </button>
        <button className="btn-ghost mx-auto mt-3" onClick={() => setConfirmCancel(true)}>
          Discard session
        </button>
        {confirmCancel && (
          <ConfirmDiscard onConfirm={handleDiscard} onClose={() => setConfirmCancel(false)} />
        )}
      </div>
    );
  }

  // ---------- Focus mode: the work, the timer, and the identity ----------
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      {/* Persistent branding: quiet, above the work, never competing with it. */}
      <Wordmark className="text-base opacity-80" />
      <p className="mt-3 font-display text-xl font-medium text-ink-soft sm:text-2xl">{liveName}</p>

      <div className="mt-8">
        <FlipTimer elapsedMs={elapsed} />
      </div>

      <p
        className={`mt-4 h-5 text-sm font-medium uppercase tracking-[0.14em] text-ink-faint transition-opacity duration-200 ${
          session.status === "paused" ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={session.status !== "paused"}
      >
        Paused
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3">
        <button className="btn-primary w-full" onClick={finish}>
          Finish
        </button>
        <div className="grid w-full grid-cols-3 gap-2">
          {session.status === "running" ? (
            <button className="btn-quiet" onClick={pause}>
              Pause
            </button>
          ) : (
            <button className="btn-quiet" onClick={resume}>
              Resume
            </button>
          )}
          <button className="btn-quiet" onClick={restart}>
            Restart
          </button>
          <button className="btn-quiet" onClick={() => setConfirmCancel(true)}>
            Cancel
          </button>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDiscard onConfirm={handleDiscard} onClose={() => setConfirmCancel(false)} />
      )}
    </div>
  );
}

function ConfirmDiscard({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label="Cancel session"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-sm p-5 text-center">
        <p className="font-display text-lg font-semibold">Cancel this session?</p>
        <p className="mt-1.5 text-[14px] text-ink-soft">
          The timer will be discarded. Nothing will be saved.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-quiet" onClick={onClose} autoFocus>
            Keep going
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            Cancel session
          </button>
        </div>
      </div>
    </div>
  );
}

function formatFinished(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}
