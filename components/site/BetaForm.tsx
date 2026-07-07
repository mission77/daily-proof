"use client";

import { useState } from "react";

type Phase = "idle" | "sending" | "done";
const IS_DEV = process.env.NODE_ENV === "development";

export function BetaForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const value = email.trim();
    if (!value || phase === "sending") return;
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/beta/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (res.ok) {
        setPhase("done");
        return;
      }
      if (res.status === 400) {
        setError("That doesn't look like a valid email address.");
      } else if (res.status === 503 && IS_DEV) {
        setError("Beta signups aren't configured yet (set LOOPS_API_KEY).");
      } else {
        setError("Something went wrong on our side. Please try again in a moment.");
      }
      setPhase("idle");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <div className="card mx-auto max-w-md p-7 text-center" role="status">
        <p className="font-display text-2xl font-semibold">
          You&rsquo;re in<span className="wordmark-dot">.</span>
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Thanks for requesting a Founding Beta invitation. Over the next few days I&rsquo;ll be
          polishing Daily Proof before inviting the first testers. You&rsquo;ll be among the first
          to receive an invitation.
        </p>
        <p className="mt-3 text-[15px] text-ink-soft">In the meantime, keep building what matters.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <p className="text-center text-[14px] font-medium text-ink-soft">
        Join the first Founding Beta members.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="beta-email" className="sr-only">
          Email address
        </label>
        <input
          id="beta-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="field flex-1"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          className="btn-primary shrink-0 px-6"
          onClick={submit}
          disabled={phase === "sending" || email.trim().length === 0}
        >
          {phase === "sending" ? "Sending…" : "Request Early Access"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-center text-[13px] text-red-500" role="alert">
          {error}
        </p>
      )}
      <p className="mt-4 text-center text-[12.5px] leading-relaxed text-ink-faint">
        Your email is only used to send your beta invitation. Daily Proof itself requires no
        account and does not track your work.
      </p>
    </div>
  );
}
