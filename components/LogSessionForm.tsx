"use client";

import { useRef, useState } from "react";
import { Practice } from "@/lib/types";

export interface LogSessionInput {
  practiceId: string;
  durationMs: number;
  completed: boolean;
  completedAt: string; // ISO
  measurement?: number;
  notes?: string;
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Records proof for work done outside the app — a watch, another timer, or
 *  no timer at all. Saves through the same saveProof() call as the built-in
 *  Stopwatch and Timer, so the resulting entry is indistinguishable in the
 *  Book from one Daily Proof timed itself. */
export function LogSessionForm({
  practices,
  defaultPracticeId,
  onSave,
  onClose,
}: {
  practices: Practice[];
  defaultPracticeId: string;
  onSave: (input: LogSessionInput) => Promise<void>;
  onClose: () => void;
}) {
  const [practiceId, setPracticeId] = useState(defaultPracticeId);
  const [minutes, setMinutes] = useState("");
  const [when, setWhen] = useState(() => toLocalDatetimeValue(new Date()));
  const [completed, setCompleted] = useState(true);
  const [measurement, setMeasurement] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const minutesRef = useRef<HTMLInputElement>(null);

  const practice = practices.find((p) => p.id === practiceId);
  const usesMeasurement = practice?.evidenceTypes.includes("measurement");

  async function submit() {
    const trimmed = minutes.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      setError("Enter a number of minutes.");
      minutesRef.current?.focus();
      return;
    }
    const value = Number(trimmed);
    if (value <= 0) {
      setError("Duration must be more than zero.");
      minutesRef.current?.focus();
      return;
    }
    const completedAtDate = new Date(when);
    if (Number.isNaN(completedAtDate.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }
    if (completedAtDate.getTime() > Date.now() + 60_000) {
      setError("Date and time can't be in the future.");
      return;
    }
    setError(null);
    setSaving(true);
    const measurementValue = usesMeasurement && measurement.trim() !== "" ? Number(measurement) : undefined;
    await onSave({
      practiceId,
      durationMs: Math.round(value * 60_000),
      completed,
      completedAt: completedAtDate.toISOString(),
      measurement: measurementValue !== undefined && Number.isFinite(measurementValue) ? measurementValue : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Log a session"
    >
      <div className="card flex max-h-[92dvh] w-full max-w-md flex-col rounded-b-none p-5 sm:rounded-2xl sm:p-6">
        <h2 className="font-display text-xl font-semibold">Log a session</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          For work done with a watch, another timer, or no timer at all.
        </p>

        <div className="mt-3 min-h-0 space-y-3 overflow-y-auto">
          <div>
            <label htmlFor="log-practice" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Practice
            </label>
            <select
              id="log-practice"
              className="field"
              value={practiceId}
              onChange={(e) => setPracticeId(e.target.value)}
            >
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="log-duration" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Duration (min)
              </label>
              <input
                ref={minutesRef}
                id="log-duration"
                className="field"
                inputMode="decimal"
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="log-when" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Date and time
              </label>
              <input
                id="log-when"
                type="datetime-local"
                className="field"
                value={when}
                max={toLocalDatetimeValue(new Date())}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-soft">Completed what you intended?</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup">
              {[
                { v: true, label: "Yes" },
                { v: false, label: "Not quite" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
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
              <label htmlFor="log-measurement" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Measurement{practice?.measurementUnit ? ` (${practice.measurementUnit})` : ""}
              </label>
              <input
                id="log-measurement"
                className="field"
                inputMode="decimal"
                value={measurement}
                onChange={(e) => setMeasurement(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div>
            <label htmlFor="log-notes" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Notes <span className="text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="log-notes"
              className="field min-h-[80px] resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened in this session?"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-line pt-4">
          <button className="btn-quiet" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving || practices.length === 0}>
            {saving ? "Saving…" : "Save proof"}
          </button>
        </div>
      </div>
    </div>
  );
}
