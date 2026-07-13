"use client";

import { useState } from "react";
import { FAQS } from "@/lib/faqs";

export function FaqList() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((f, i) => {
        const open = openIdx === i;
        return (
          <div key={f.q} className="card overflow-hidden">
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
            >
              <span className="font-display text-[16.5px] font-semibold">{f.q}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className={`shrink-0 text-ink-faint transition-transform duration-300 ease-out ${
                  open ? "rotate-45" : ""
                }`}
              >
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[14.5px] leading-relaxed text-ink-soft">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
