"use client";

import { Fragment, useEffect, useState } from "react";
import { timerParts } from "@/lib/time";

/** One rolling digit. On change, the new digit rolls down into view over the
 *  old one — whole glyphs only, so nothing can ever render cropped. Motion is
 *  downward only. Reduced motion snaps instantly via CSS. */
function RollDigit({ value }: { value: string }) {
  const [state, setState] = useState({ current: value, previous: value, rolling: false });

  useEffect(() => {
    setState((s) => (s.current === value ? s : { current: value, previous: s.current, rolling: true }));
  }, [value]);

  useEffect(() => {
    if (!state.rolling) return;
    const t = setTimeout(
      () => setState((s) => ({ ...s, previous: s.current, rolling: false })),
      480
    );
    return () => clearTimeout(t);
  }, [state.rolling, state.current]);

  const { current, previous, rolling } = state;

  return (
    <span className={`flip-digit ${rolling ? "is-flipping" : ""}`} aria-hidden>
      {/* Track holds [new, old] stacked; rolling slides it down so the new
          digit descends into the window while the old one exits below. */}
      <span key={`${previous}-${current}`} className={`roll-track ${rolling ? "roll-anim" : ""}`}>
        <span className="roll-cell">{current}</span>
        <span className="roll-cell">{rolling ? previous : current}</span>
      </span>
    </span>
  );
}

export function FlipTimer({ elapsedMs }: { elapsedMs: number }) {
  const groups = timerParts(elapsedMs);
  const label = groups.join(":");

  return (
    <div
      role="timer"
      aria-label={`Elapsed time ${label}`}
      className="flex items-center justify-center gap-1.5 sm:gap-2
        [--dw:2.7rem] [--dh:4rem] [--dfs:2.4rem]
        sm:[--dw:3.6rem] sm:[--dh:5.2rem] sm:[--dfs:3.2rem]
        md:[--dw:4.4rem] md:[--dh:6.4rem] md:[--dfs:4rem]"
    >
      {groups.map((group, gi) => (
        <Fragment key={`g-${gi}`}>
          {gi > 0 && (
            <span className="flip-colon" aria-hidden>
              :
            </span>
          )}
          <span className="flex gap-1 sm:gap-1.5">
            {group.split("").map((ch, ci) => (
              <RollDigit key={`d-${gi}-${ci}`} value={ch} />
            ))}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
