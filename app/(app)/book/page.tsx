"use client";

import { useCallback, useEffect, useState } from "react";
import { SessionEntry } from "@/lib/types";
import { deleteSession, editSessionNote, listSessionsForDay } from "@/lib/repos/sessions";
import { formatDayHeading, formatDuration, formatTimeOfDay, isSameLocalDay } from "@/lib/time";
import { useToast } from "@/components/Toast";

export default function BookPage() {
  const toast = useToast();
  const [date, setDate] = useState(() => startOfDay(new Date()));
  const [entries, setEntries] = useState<SessionEntry[] | null>(null);
  const [editing, setEditing] = useState<SessionEntry | null>(null);

  const reload = useCallback(async (d: Date) => {
    const list = await listSessionsForDay(d);
    setEntries(list);
  }, []);

  useEffect(() => {
    reload(date);
  }, [date, reload]);

  const isToday = isSameLocalDay(date, new Date());

  function go(delta: number) {
    setEntries(null);
    setDate((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + delta);
      return next;
    });
  }

  async function removeEntry(entry: SessionEntry) {
    await deleteSession(entry.id);
    setEditing(null);
    toast("Proof deleted");
    reload(date);
  }

  async function saveNote(entry: SessionEntry, notes: string) {
    const updated = await editSessionNote(entry.id, notes);
    setEditing(null);
    if (updated && updated.noteEdited && updated.updatedAt !== entry.updatedAt) {
      toast("Note updated");
    }
    await reload(date);
  }

  return (
    <div>
      {/* Page header: the date is the page */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold sm:text-2xl">{formatDayHeading(date)}</h1>
        <div className="flex shrink-0 gap-1.5">
          <button className="btn-quiet px-3.5 py-2" aria-label="Previous day" onClick={() => go(-1)}>
            ←
          </button>
          <button
            className="btn-quiet px-3.5 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next day"
            disabled={isToday}
            onClick={() => go(1)}
          >
            →
          </button>
        </div>
      </div>

      {entries === null && (
        <div className="card mt-5 space-y-3 p-4" aria-busy="true" aria-label="Loading entries">
          <div className="h-4 w-2/5 animate-pulse rounded bg-surface2" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-surface2" />
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <div className="mt-16 text-center">
          <p className="font-display text-xl font-semibold">No proof collected yet.</p>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            {isToday ? "Your first page begins today." : "This page stayed blank."}
          </p>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <ul className="card mt-5 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-surface2/60"
                onClick={() => setEditing(e)}
                aria-label={`Edit note for ${e.practiceNameSnapshot}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{e.practiceNameSnapshot}</span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-faint">
                    {formatTimeOfDay(e.completedAt)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-ink-soft">
                  <span className="tabular-nums">{formatDuration(e.durationMs)}</span>
                  <span aria-hidden>·</span>
                  <span>{e.completed ? "Completed" : "Ended early"}</span>
                  {e.measurement !== undefined && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">
                        {e.measurement}
                        {e.measurementUnit ? ` ${e.measurementUnit}` : ""}
                      </span>
                    </>
                  )}
                  {e.noteEdited && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-ink-faint">Edited</span>
                    </>
                  )}
                </div>
                {e.notes && <p className="mt-1.5 line-clamp-2 text-[14px] text-ink-soft">{e.notes}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && <NoteEditor entry={editing} onSave={saveNote}
          onDelete={removeEntry} onClose={() => setEditing(null)} />}
    </div>
  );
}

function NoteEditor({
  entry,
  onSave,
  onClose,
  onDelete,
}: {
  entry: SessionEntry;
  onSave: (entry: SessionEntry, notes: string) => Promise<void>;
  onClose: () => void;
  onDelete: (entry: SessionEntry) => Promise<void>;
}) {
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Edit note"
    >
      <div className="card w-full max-w-md rounded-b-none p-5 sm:rounded-2xl sm:p-6">
        <h2 className="font-display text-xl font-semibold">{entry.practiceNameSnapshot}</h2>
        <p className="mt-1 text-[13px] text-ink-faint">
          {formatTimeOfDay(entry.completedAt)} · {formatDuration(entry.durationMs)} ·{" "}
          {entry.completed ? "Completed" : "Ended early"}
          {entry.measurement !== undefined &&
            ` · ${entry.measurement}${entry.measurementUnit ? ` ${entry.measurementUnit}` : ""}`}
        </p>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">
          Only the note can change. The proof itself is permanent.
        </p>

        <textarea
          className="field mt-4 min-h-[120px] resize-y"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note to this proof…"
          autoFocus
        />

        <div className="mt-5 flex items-center justify-between gap-2">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-ink-soft">Delete this proof?</span>
              <button
                className="btn-quiet text-red-500"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await onDelete(entry);
                }}
              >
                Delete
              </button>
              <button className="btn-ghost" onClick={() => setConfirmingDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <button
              className="btn-ghost text-ink-faint hover:text-red-500"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete session
            </button>
          )}
          <div className="flex gap-2">
            <button className="btn-quiet" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                await onSave(entry, notes);
              }}
            >
              Save note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
