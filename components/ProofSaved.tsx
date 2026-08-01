"use client";

import { useState } from "react";
import { SessionEntry } from "@/lib/types";
import type { Quote } from "@/lib/quotes";
import { renderShareCard, shareCard } from "@/lib/sharecard";
import { formatFinished } from "@/lib/time";
import { Wordmark } from "@/components/Wordmark";
import { useToast } from "@/components/Toast";

/** The one "proof saved" moment every completion path ends at — Timer,
 *  Stopwatch, and a manually logged session all land here on the identical
 *  screen, so a logged session is indistinguishable from a timed one. */
export function ProofSaved({
  entry,
  quote,
  onDone,
}: {
  entry: SessionEntry;
  quote: Quote | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!quote || sharing) return;
    setSharing(true);
    try {
      const blob = await renderShareCard({
        practiceName: entry.practiceNameSnapshot,
        durationMs: entry.durationMs,
        measurement: entry.measurement,
        measurementUnit: entry.measurementUnit,
        completedAt: entry.completedAt,
        quote,
      });
      const result = await shareCard(blob, entry.practiceNameSnapshot);
      if (result === "downloaded") toast("Share card saved as image");
    } catch {
      toast("Couldn't create the share card");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 py-10 text-center lg:max-w-lg">
      <Wordmark className="text-lg" />
      <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-full bg-ember/10 text-ember-ink">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold">Proof saved.</h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        {entry.practiceNameSnapshot} · {formatFinished(entry.durationMs)}
      </p>
      {quote && (
        <blockquote className="mx-auto mt-7 max-w-sm">
          <p className="font-display text-[17px] italic leading-relaxed text-ink-soft">
            &ldquo;{quote.text}&rdquo;
          </p>
          {quote.author && (
            <cite className="mt-1.5 block text-[13px] not-italic text-ink-faint">
              &mdash; {quote.author}
            </cite>
          )}
        </blockquote>
      )}
      <div className="mt-9 flex w-full max-w-xs flex-col gap-3">
        <button className="btn-primary w-full" onClick={handleShare} disabled={sharing}>
          {sharing ? "Preparing card…" : "Share proof"}
        </button>
        <button className="btn-quiet w-full" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
