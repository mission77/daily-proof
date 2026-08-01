"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActiveSession, Practice, SessionEntry, nowIso } from "@/lib/types";
import {
  clearActiveSession,
  elapsedMs,
  getActiveSession,
  getSoundEnabled,
  setActiveSession,
} from "@/lib/repos/settings";
import { getPractice } from "@/lib/repos/practices";
import { saveProof } from "@/lib/repos/sessions";
import { pickQuote, type Quote } from "@/lib/quotes";
import { formatFinished } from "@/lib/time";
import { playCompletionSound, vibrateCompletion } from "@/lib/completionSound";
import { FlipTimer } from "@/components/FlipTimer";
import { Wordmark } from "@/components/Wordmark";
import { ProofSaved } from "@/components/ProofSaved";
import { AccessGuard } from "@/components/AccessGuard";

/** Focus lives outside the (app) shell for a chrome-free screen, so it needs
 *  its own guard: sessions require a valid access code like the rest of the app. */
export default function FocusPage() {
  return (
    <AccessGuard>
      <FocusSession />
    </AccessGuard>
  );
}

function FocusSession() {
  const router = useRouter();
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

  // Confirm dialogs: cancelling discards everything; restarting wipes
  // elapsed time. Both are one-tap-away and irreversible, so neither fires
  // directly from its button — a stray tap must not cost real work.
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

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

  /** Resets the timer to 00:00 immediately and keeps the session running.
   *  Called only after the confirm dialog — this discards elapsed time
   *  irreversibly, the same as cancelling, so it gets the same safety net.
   *  For a Timer session this also un-does "reached zero" / overtime —
   *  restarting means the planned duration starts counting down fresh. */
  const restart = useCallback(async () => {
    if (!session || session.status === "finishing") return;
    const next: ActiveSession = {
      ...session,
      startedAt: nowIso(),
      lastResumedAt: nowIso(),
      accumulatedMs: 0,
      status: "running",
      completionSoundPlayed: false,
      continuedPastPlanned: false,
    };
    setSession(next);
    setNow(Date.now());
    await setActiveSession(next);
    setConfirmRestart(false);
  }, [session]);

  /** Past zero on a Timer session, the user chooses to keep going. The
   *  underlying accumulation is untouched — the same stopwatch-style math
   *  that has been running the whole time simply keeps running; only the
   *  display switches from a countdown to counting overtime up from zero. */
  const continueWorking = useCallback(async () => {
    if (!session) return;
    const next: ActiveSession = { ...session, continuedPastPlanned: true };
    setSession(next);
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

    // Picked before saving so it can be snapshotted onto the entry itself —
    // sharing this proof later (from the Book) recreates the exact same
    // card instead of drawing a new random quote.
    let quote: Quote | null = null;
    try {
      quote = await pickQuote(liveName || session.practiceNameSnapshot, practice?.description);
    } catch {
      /* quote is optional */
    }

    const entry = await saveProof({
      // Deterministic id: one active session yields one proof entry. If the
      // steps after the save ever fail and the finish screen reappears,
      // saving again overwrites this entry instead of duplicating it.
      id: `${session.practiceId}@${session.startedAt}`,
      practiceId: session.practiceId,
      practiceNameSnapshot: liveName || session.practiceNameSnapshot,
      durationMs: duration,
      completed,
      measurement: Number.isFinite(measurementValue) ? measurementValue : undefined,
      measurementUnit: practice?.measurementUnit,
      notes: usesNotes ? notes : undefined,
      startedAt: session.startedAt,
      completedAt: nowIso(),
      mode: session.mode,
      plannedDurationMs: session.plannedDurationMs,
      quote: quote ?? undefined,
    });
    // The proof is saved; nothing decorative may undo that from the user's
    // point of view. A failed cleanup must still land on "saved".
    try {
      await clearActiveSession();
    } catch {
      /* the deterministic id above keeps a re-save from duplicating */
    }
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

  // ---------- Proof saved ----------
  if (savedEntry) {
    return <ProofSaved entry={savedEntry} quote={savedQuote} onDone={() => router.push("/book")} />;
  }

  if (session === undefined || session === null) {
    return <div className="min-h-dvh bg-bg" />;
  }

  const elapsed = elapsedMs(session, now);
  const isTimer = session.mode === "timer" && session.plannedDurationMs != null;
  const plannedDurationMs = session.plannedDurationMs ?? 0;
  const reachedZero = isTimer && elapsed >= plannedDurationMs;
  const inOvertime = isTimer && reachedZero && !!session.continuedPastPlanned;
  const showCompletionPrompt =
    isTimer && reachedZero && !session.continuedPastPlanned && session.status === "running";

  // ---------- Timer reached zero: decide before continuing ----------
  if (showCompletionPrompt) {
    return (
      <TimerComplete
        liveName={liveName}
        plannedDurationMs={plannedDurationMs}
        session={session}
        onFinish={finish}
        onContinue={continueWorking}
      />
    );
  }

  // ---------- Finish screen ----------
  if (session.status === "finishing") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 lg:max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">Session finished</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{liveName}</h1>
        <p className="mt-1 text-ink-soft tabular-nums">{formatFinished(elapsed)}</p>

        <div className="card mt-6 space-y-5 p-5 lg:p-7">
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

        <button className="btn-primary mt-5 w-full" onClick={handleSaveProof} disabled={saving}>
          {saving ? "Saving\u2026" : "Save proof"}
        </button>
        <button className="btn-ghost mx-auto mt-3" onClick={() => setConfirmCancel(true)}>
          Discard session
        </button>
        {confirmCancel && (
          <ConfirmAction
            label="Discard session"
            title="Discard this session?"
            body="The timer will be discarded. Nothing will be saved."
            confirmLabel="Discard"
            onConfirm={handleDiscard}
            onClose={() => setConfirmCancel(false)}
          />
        )}
      </div>
    );
  }

  // ---------- Focus mode: the work, the timer, and the identity ----------
  // Three possible readings of the same underlying accumulation: a plain
  // Stopwatch count-up, a Timer counting down to zero, or — past zero, once
  // "Continue working" was chosen — overtime counting up from zero again.
  const displayMs = !isTimer ? elapsed : inOvertime ? elapsed - plannedDurationMs : Math.max(0, plannedDurationMs - elapsed);
  const displayLabel = !isTimer ? "Elapsed time" : inOvertime ? "Overtime" : "Time remaining";
  const caption = session.status === "paused" ? "Paused" : inOvertime ? "Overtime" : "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <StudioLink />
      {/* Persistent branding: quiet, above the work, never competing with it. */}
      <Wordmark className="text-base opacity-80" />
      <p className="mt-3 font-display text-xl font-medium text-ink-soft sm:text-2xl lg:text-3xl">{liveName}</p>

      <div className="mt-8">
        <FlipTimer elapsedMs={displayMs} label={displayLabel} />
      </div>

      <p
        className={`mt-4 h-5 text-sm font-medium uppercase tracking-[0.14em] text-ink-faint transition-opacity duration-200 ${
          caption ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!caption}
      >
        {caption || " "}
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-3 lg:max-w-sm">
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
          <button className="btn-quiet" onClick={() => setConfirmRestart(true)}>
            Restart
          </button>
          <button className="btn-quiet" onClick={() => setConfirmCancel(true)}>
            Cancel
          </button>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmAction
          label="Cancel session"
          title="Cancel this session?"
          body="The timer will be discarded. Nothing will be saved."
          confirmLabel="Cancel session"
          onConfirm={handleDiscard}
          onClose={() => setConfirmCancel(false)}
        />
      )}
      {confirmRestart && (
        <ConfirmAction
          label="Restart session"
          title="Restart this session?"
          body="The elapsed time will reset to 00:00. This can't be undone."
          confirmLabel="Restart"
          onConfirm={restart}
          onClose={() => setConfirmRestart(false)}
        />
      )}
    </div>
  );
}

/** Shown exactly once per Timer session, the moment elapsed time first
 *  reaches the planned duration. Plays the completion sound (once — guarded
 *  by a flag persisted on the session, so a refresh right after zero can't
 *  replay it) and waits for an explicit choice: Finish now, or keep going
 *  into overtime. Reaching zero is not itself an error or an automatic
 *  save — the user still decides what happened. */
function TimerComplete({
  liveName,
  plannedDurationMs,
  session,
  onFinish,
  onContinue,
}: {
  liveName: string;
  plannedDurationMs: number;
  session: ActiveSession;
  onFinish: () => void;
  onContinue: () => void;
}) {
  const firingRef = useRef(false);

  useEffect(() => {
    if (session.completionSoundPlayed || firingRef.current) return;
    firingRef.current = true;
    (async () => {
      try {
        const enabled = await getSoundEnabled();
        if (enabled) {
          await playCompletionSound();
          vibrateCompletion();
        }
      } finally {
        // Persisted regardless of whether sound is enabled: "played" here
        // means "the completion moment has been handled," so re-enabling
        // sound later and refreshing doesn't trigger a late, confusing ding.
        await setActiveSession({ ...session, completionSoundPlayed: true });
      }
    })();
    // session is intentionally not a dependency: this must fire once for
    // this specific zero-crossing, not on every field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <StudioLink />
      <Wordmark className="text-base opacity-80" />
      <p className="mt-3 font-display text-xl font-medium text-ink-soft sm:text-2xl">{liveName}</p>
      <div className="mt-8">
        <FlipTimer elapsedMs={plannedDurationMs} label="Planned duration reached" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold" role="status" aria-live="polite">
        Time complete.
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        Your planned {Math.round(plannedDurationMs / 60_000)} minutes are up. Finish now, or keep going.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button className="btn-primary w-full" onClick={onFinish} autoFocus>
          Finish session
        </button>
        <button className="btn-quiet w-full" onClick={onContinue}>
          Continue working
        </button>
      </div>
    </div>
  );
}

/** Quiet secondary navigation back to Studio while the session keeps
 *  running untouched — a plain route change, not a session control, so it
 *  never pauses/finishes/resets anything (see FocusSession: nothing there
 *  reacts to unmount or route changes). Desktop/tablet only: on a phone the
 *  native Back gesture already returns to Studio without disturbing the
 *  session, so a second on-screen control would just be redundant chrome
 *  competing for the same limited space as the timer and practice title. */
function StudioLink() {
  return (
    <Link
      href="/studio"
      aria-label="Back to Studio — session keeps running"
      className="btn-ghost fixed left-4 top-4 hidden sm:inline-flex sm:left-6 sm:top-6"
    >
      <span aria-hidden>←</span> Studio
    </Link>
  );
}

function ConfirmAction({
  label,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  label: string;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      role="alertdialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-sm p-5 text-center">
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className="mt-1.5 text-[14px] text-ink-soft">{body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="btn-quiet" onClick={onClose} autoFocus>
            Keep going
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
