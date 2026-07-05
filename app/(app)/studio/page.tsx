"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActiveSession, Practice, nowIso } from "@/lib/types";
import {
  PracticeInput,
  createPractice,
  deletePractice,
  listPractices,
  movePractice,
  updatePractice,
} from "@/lib/repos/practices";
import {
  getActiveSession,
  getFocusPracticeId,
  setActiveSession,
  setFocusPracticeId,
} from "@/lib/repos/settings";
import { PracticeForm } from "@/components/PracticeForm";
import { useToast } from "@/components/Toast";

const EVIDENCE_LABEL: Record<string, string> = {
  timer: "Timer",
  notes: "Notes",
  measurement: "Measurement",
};

export default function StudioPage() {
  const router = useRouter();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [focusId, setFocusId] = useState<string | undefined>();
  const [active, setActive] = useState<ActiveSession | undefined>();
  const [formTarget, setFormTarget] = useState<Practice | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Practice | null>(null);

  const reload = useCallback(async () => {
    try {
      const [list, fid, session] = await Promise.all([
        listPractices(),
        getFocusPracticeId(),
        getActiveSession(),
      ]);
      setPractices(list);
      setFocusId(fid);
      setActive(session);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Storage could not be opened.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeList = practices.filter((p) => !p.archived);
  const archivedList = practices.filter((p) => p.archived);
  const focus = activeList.find((p) => p.id === focusId) ?? activeList[0];
  const others = activeList.filter((p) => p.id !== focus?.id);

  async function startSession(practice: Practice) {
    // A session already in progress takes priority — return to it, never overwrite it.
    const existing = await getActiveSession();
    if (existing) {
      router.push("/focus");
      return;
    }
    const session: ActiveSession = {
      practiceId: practice.id,
      practiceNameSnapshot: practice.name,
      startedAt: nowIso(),
      accumulatedMs: 0,
      lastResumedAt: nowIso(),
      status: "running",
    };
    await setActiveSession(session);
    router.push("/focus");
  }

  async function chooseFocus(id: string) {
    await setFocusPracticeId(id);
    setFocusId(id);
  }

  async function handleSave(input: PracticeInput) {
    if (formTarget === "new") {
      const created = await createPractice(input);
      if (activeList.length === 0) await setFocusPracticeId(created.id);
      toast("Practice created");
    } else if (formTarget) {
      await updatePractice(formTarget.id, input);
      toast("Practice updated");
    }
    setFormTarget(null);
    await reload();
  }

  async function handleArchiveToggle(p: Practice) {
    await updatePractice(p.id, { archived: !p.archived });
    toast(p.archived ? "Practice restored" : "Practice archived");
    await reload();
  }

  async function handleDelete(p: Practice) {
    await deletePractice(p.id);
    if (focusId === p.id) await setFocusPracticeId(undefined);
    setConfirmDelete(null);
    toast("Practice deleted — its proof stays in your Book");
    await reload();
  }

  async function handleMove(p: Practice, dir: -1 | 1) {
    await movePractice(p.id, dir);
    await reload();
  }

  if (!loaded) {
    // Skeleton while IndexedDB hydrates — Studio never renders blank.
    return (
      <div aria-busy="true" aria-label="Loading Studio">
        <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">
          What deserves your attention right&nbsp;now?
        </h1>
        <div className="mt-6">
          <div className="h-3 w-28 animate-pulse rounded bg-surface2" />
          <div className="card mt-2.5 space-y-3 p-6 sm:p-8">
            <div className="h-7 w-2/5 animate-pulse rounded bg-surface2" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-surface2" />
            <div className="h-11 w-40 animate-pulse rounded-xl bg-surface2" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">
          What deserves your attention right&nbsp;now?
        </h1>
        <div className="card mt-6 p-8 text-center" role="alert">
          <p className="font-display text-xl font-semibold">Your Book couldn&rsquo;t be opened.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-ink-soft">
            Local storage is unavailable — this can happen in private browsing or when site data is
            blocked. Your proof lives on this device, so Daily Proof needs storage to work.
          </p>
          <p className="mt-2 text-[13px] text-ink-faint">{loadError}</p>
          <button className="btn-primary mt-5" onClick={() => { setLoaded(false); reload(); }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">
        What deserves your attention right&nbsp;now?
      </h1>

      {/* ---------- Today's Focus ---------- */}
      <section className="mt-6" aria-labelledby="focus-heading">
        <h2 id="focus-heading" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Today&rsquo;s focus
        </h2>

        {focus ? (
          <div className="card mt-2.5 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-2xl font-semibold sm:text-[28px]">{focus.name}</p>
              {active && (
                <span className="mt-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ember/10 px-2.5 py-1 text-[12px] font-medium text-ember-ink">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ember" aria-hidden />
                  Session in progress
                </span>
              )}
            </div>
            {focus.description && <p className="mt-1.5 text-[15px] text-ink-soft">{focus.description}</p>}
            <p className="mt-2 text-[13px] text-ink-faint">
              {focus.evidenceTypes.map((t) => EVIDENCE_LABEL[t]).join(" · ")}
              {focus.measurementUnit ? ` (${focus.measurementUnit})` : ""}
            </p>
            <div className="mt-6">
              {active ? (
                <button className="btn-primary w-full sm:w-auto" onClick={() => router.push("/focus")}>
                  Return to session
                </button>
              ) : (
                <button className="btn-primary w-full sm:w-auto" onClick={() => startSession(focus)}>
                  Start session
                </button>
              )}
            </div>
          </div>
        ) : archivedList.length > 0 ? (
          <div className="card mt-2.5 p-8 text-center">
            <p className="font-display text-xl font-semibold">All practices are archived.</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-ink-soft">
              Restore one below to make it today&rsquo;s focus, or begin something new.
            </p>
            <button className="btn-primary mt-5" onClick={() => setFormTarget("new")}>
              Create Practice
            </button>
          </div>
        ) : (
          <div className="card mt-2.5 p-8 text-center">
            <p className="font-display text-xl font-semibold">
              Your first proof begins with one&nbsp;practice.
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-ink-soft">
              A practice is the work that matters to you. Name it, then collect proof that you showed up.
            </p>
            <button className="btn-primary mt-5" onClick={() => setFormTarget("new")}>
              Create Practice
            </button>
          </div>
        )}
      </section>

      {/* ---------- Other Practices ---------- */}
      {(others.length > 0 || archivedList.length > 0) && (
        <section className="mt-8" aria-labelledby="others-heading">
          <h2 id="others-heading" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
            Other practices
          </h2>
          <ul className="card mt-2.5 divide-y divide-line">
            {others.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-3">
                <button
                  className="min-w-0 flex-1 rounded-md text-left"
                  onClick={() => chooseFocus(p.id)}
                  title="Make this today's focus"
                >
                  <span className="block truncate text-[15px] font-medium">{p.name}</span>
                  <span className="block text-[12.5px] text-ink-faint">
                    {p.evidenceTypes.map((t) => EVIDENCE_LABEL[t]).join(" · ")}
                  </span>
                </button>
                <div className="flex shrink-0 items-center">
                  <button
                    className="btn-ghost px-2"
                    aria-label={`Move ${p.name} up`}
                    disabled={i === 0}
                    onClick={() => handleMove(p, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="btn-ghost px-2"
                    aria-label={`Move ${p.name} down`}
                    disabled={i === others.length - 1}
                    onClick={() => handleMove(p, 1)}
                  >
                    ↓
                  </button>
                  <PracticeMenu
                    practice={p}
                    onFocus={() => chooseFocus(p.id)}
                    onEdit={() => setFormTarget(p)}
                    onArchive={() => handleArchiveToggle(p)}
                    onDelete={() => setConfirmDelete(p)}
                  />
                </div>
              </li>
            ))}
            {archivedList.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-3 opacity-60">
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]">{p.name}</span>
                  <span className="block text-[12.5px] text-ink-faint">Archived</span>
                </div>
                <button className="btn-ghost" onClick={() => handleArchiveToggle(p)}>
                  Restore
                </button>
                <button className="btn-ghost text-red-500" onClick={() => setConfirmDelete(p)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- New Practice / edit focus ---------- */}
      <section className="mt-8 flex flex-wrap gap-2">
        {focus && (
          <>
            <button className="btn-quiet" onClick={() => setFormTarget("new")}>
              New practice
            </button>
            <button className="btn-ghost" onClick={() => setFormTarget(focus)}>
              Edit focus
            </button>
            <button className="btn-ghost" onClick={() => handleArchiveToggle(focus)}>
              Archive focus
            </button>
          </>
        )}
      </section>

      {formTarget && (
        <PracticeForm
          practice={formTarget === "new" ? undefined : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Delete practice"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
        >
          <div className="card w-full max-w-sm p-6">
            <h2 className="font-display text-xl font-semibold">Delete “{confirmDelete.name}”?</h2>
            <p className="mt-2 text-[15px] text-ink-soft">
              The practice goes away. Every proof you collected stays in your Book, untouched.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-quiet" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition-transform active:scale-[0.98]"
                onClick={() => handleDelete(confirmDelete)}
              >
                Delete practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeMenu({
  practice,
  onFocus,
  onEdit,
  onArchive,
  onDelete,
}: {
  practice: Practice;
  onFocus: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="relative">
      <button
        className="btn-ghost px-2.5"
        aria-label={`More actions for ${practice.name}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="card absolute right-0 top-9 z-20 w-44 overflow-hidden p-1 text-sm shadow-lg">
          <MenuItem label="Make focus" onClick={onFocus} />
          <MenuItem label="Edit" onClick={onEdit} />
          <MenuItem label="Archive" onClick={onArchive} />
          <MenuItem label="Delete" danger onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`block w-full rounded-lg px-3 py-2 text-left hover:bg-surface2 ${
        danger ? "text-red-500" : "text-ink"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
