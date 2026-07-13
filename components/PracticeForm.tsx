"use client";

import { useEffect, useRef, useState } from "react";
import { EvidenceType, Practice } from "@/lib/types";
import { PracticeInput } from "@/lib/repos/practices";

const EVIDENCE_OPTIONS: { type: EvidenceType; label: string; hint: string }[] = [
  { type: "timer", label: "Timer", hint: "Time spent is the proof" },
  { type: "notes", label: "Notes", hint: "Write what happened" },
  { type: "measurement", label: "Measurement", hint: "A number you track" },
];

interface PracticeFormProps {
  practice?: Practice; // undefined = create
  onSave: (input: PracticeInput) => Promise<void>;
  onClose: () => void;
}

export function PracticeForm({ practice, onSave, onClose }: PracticeFormProps) {
  const [name, setName] = useState(practice?.name ?? "");
  const [description, setDescription] = useState(practice?.description ?? "");
  const [types, setTypes] = useState<Set<EvidenceType>>(
    () => new Set<EvidenceType>(practice?.evidenceTypes ?? ["timer"])
  );
  const [unit, setUnit] = useState(practice?.measurementUnit ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(t: EvidenceType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function submit() {
    if (name.trim() === "") {
      setError("Give this practice a name.");
      return;
    }
    if (types.size === 0) {
      setError("Choose at least one kind of evidence.");
      return;
    }
    setSaving(true);
    await onSave({
      name,
      description,
      evidenceTypes: Array.from(types),
      measurementUnit: types.has("measurement") ? unit : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={practice ? "Edit practice" : "New practice"}
    >
      <div className="card flex max-h-[92dvh] w-full max-w-md flex-col rounded-b-none p-5 sm:rounded-2xl sm:p-6">
        <h2 className="font-display text-xl font-semibold">{practice ? "Edit practice" : "New practice"}</h2>

        <div className="mt-3 min-h-0 space-y-3 overflow-y-auto">
          <div>
            <label htmlFor="p-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Name
            </label>
            <input
              ref={nameRef}
              id="p-name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deep work, writing, violin…"
              maxLength={80}
            />
          </div>

          <div>
            <label htmlFor="p-desc" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Description <span className="text-ink-faint">(optional)</span>
            </label>
            <input
              id="p-desc"
              className="field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What counts as showing up?"
              maxLength={140}
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-soft">Evidence</legend>
            <div className="space-y-1.5">
              {EVIDENCE_OPTIONS.map((opt) => {
                const checked = types.has(opt.type);
                return (
                  <label
                    key={opt.type}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                      checked ? "border-ember/60 bg-ember/5" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.type)}
                      className="h-4 w-4 shrink-0 accent-[hsl(var(--ember))]"
                    />
                    <span className="min-w-0 truncate text-[14.5px]">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-ink-faint"> — {opt.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {types.has("measurement") && (
            <div>
              <label htmlFor="p-unit" className="mb-1.5 block text-sm font-medium text-ink-soft">
                Measurement unit <span className="text-ink-faint">(optional)</span>
              </label>
              <input
                id="p-unit"
                className="field"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pages, km, reps…"
                maxLength={20}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-line pt-4">
          <button className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {practice ? "Save changes" : "Create practice"}
          </button>
        </div>
      </div>
    </div>
  );
}
