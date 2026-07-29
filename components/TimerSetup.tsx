"use client";

import { useEffect, useState } from "react";
import { SessionMode } from "@/lib/types";

const PRESET_MINUTES = [25, 45, 60, 90];
const MIN_MINUTES = 1;
const MAX_MINUTES = 480; // 8 hours — generous, but not an unreasonable duration to persist a countdown for

export interface TimerChoice {
  mode: SessionMode;
  /** Only meaningful when mode is "timer". */
  plannedDurationMs?: number;
}

/** The calm mode choice on Start Session: Stopwatch (open-ended) or Timer
 *  (a committed duration). Inline in the Studio Focus card — not a
 *  separate page, not a modal. Remembers the last-used mode/duration as
 *  the starting point only; every part of it stays visible and changeable
 *  until the moment Start is pressed. */
export function TimerSetup({
  initialMode,
  initialMinutes,
  onChange,
}: {
  initialMode: SessionMode;
  initialMinutes: number;
  onChange: (choice: TimerChoice, valid: boolean) => void;
}) {
  const [mode, setMode] = useState<SessionMode>(initialMode);
  const [minutes, setMinutes] = useState<number>(
    PRESET_MINUTES.includes(initialMinutes) ? initialMinutes : PRESET_MINUTES[0]
  );
  const [isCustom, setIsCustom] = useState(!PRESET_MINUTES.includes(initialMinutes));
  const [customInput, setCustomInput] = useState(
    !PRESET_MINUTES.includes(initialMinutes) ? String(initialMinutes) : ""
  );
  const [customError, setCustomError] = useState<string | null>(null);

  function validateCustom(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setCustomError(null);
      return null;
    }
    // Reject malformed input outright (letters, symbols, multiple decimals).
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      setCustomError("Enter a number of minutes.");
      return null;
    }
    const value = Math.round(Number(trimmed));
    if (!Number.isFinite(value) || value < MIN_MINUTES) {
      setCustomError("Duration must be more than zero.");
      return null;
    }
    if (value > MAX_MINUTES) {
      setCustomError(`Keep it under ${MAX_MINUTES / 60} hours — start a new session after if you need more.`);
      return null;
    }
    setCustomError(null);
    return value;
  }

  useEffect(() => {
    if (mode === "stopwatch") {
      onChange({ mode: "stopwatch" }, true);
      return;
    }
    if (isCustom) {
      // Use validateCustom's return value directly for validity, not the
      // customError state: setCustomError() inside validateCustom only
      // takes effect on the *next* render, so reading customError here
      // would still reflect the previous keystroke's error and leave Start
      // incorrectly disabled for one extra character after a correction.
      const value = validateCustom(customInput);
      onChange(
        { mode: "timer", plannedDurationMs: value !== null ? value * 60_000 : undefined },
        value !== null
      );
    } else {
      onChange({ mode: "timer", plannedDurationMs: minutes * 60_000 }, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, minutes, isCustom, customInput]);

  return (
    <div>
      <div className="inline-flex rounded-xl border border-line p-1" role="radiogroup" aria-label="Session mode">
        {(
          [
            { value: "stopwatch" as const, label: "Stopwatch" },
            { value: "timer" as const, label: "Timer" },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={mode === opt.value}
            onClick={() => setMode(opt.value)}
            className={`rounded-lg px-4 py-1.5 text-[14px] font-medium transition-colors ${
              mode === opt.value ? "bg-surface2 text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "timer" && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timer duration">
            {PRESET_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={!isCustom && minutes === m}
                onClick={() => {
                  setIsCustom(false);
                  setMinutes(m);
                }}
                className={`rounded-lg border px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  !isCustom && minutes === m
                    ? "border-ember/70 bg-ember/10 text-ink"
                    : "border-line text-ink-soft hover:border-line-strong"
                }`}
              >
                {m} min
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={isCustom}
              onClick={() => setIsCustom(true)}
              className={`rounded-lg border px-3.5 py-2 text-[14px] font-medium transition-colors ${
                isCustom
                  ? "border-ember/70 bg-ember/10 text-ink"
                  : "border-line text-ink-soft hover:border-line-strong"
              }`}
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <div className="mt-2.5">
              <label htmlFor="timer-custom-minutes" className="sr-only">
                Custom duration in minutes
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="timer-custom-minutes"
                  className="field w-28"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Minutes"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  aria-invalid={customError !== null}
                  aria-describedby={customError ? "timer-custom-error" : undefined}
                />
                <span className="text-[14px] text-ink-faint">minutes</span>
              </div>
              {customError && (
                <p id="timer-custom-error" className="mt-1.5 text-[13px] text-red-500" role="alert">
                  {customError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
