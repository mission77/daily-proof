"use client";

import { useEffect, useState } from "react";

type Plan = "monthly" | "lifetime";

/** Pricing cards + real checkout. If the server reports payments are not
 *  configured, the buttons say so plainly instead of pretending. */
export function PlanPicker() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  async function buy(plan: Plan) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 503) {
        setConfigured(false);
        return;
      }
      if (!res.ok || !data.url) {
        setError("Checkout could not be started. Try again in a moment.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Checkout could not be started. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const disabled = configured === false;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-6 text-left">
          <p className="text-sm font-medium text-ink-soft">Monthly</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            $7<span className="text-base font-normal text-ink-faint">/month</span>
          </p>
          <p className="mt-2 text-[14px] text-ink-soft">3-day free trial, then $7 a month.</p>
          <button
            className="btn-primary mt-5 w-full"
            disabled={disabled || busy !== null}
            onClick={() => buy("monthly")}
          >
            {busy === "monthly" ? "Opening checkout…" : "Start free trial"}
          </button>
        </div>
        <div className="card relative p-6 text-left">
          <span className="absolute right-4 top-4 rounded-full bg-ember/10 px-2.5 py-0.5 text-[12px] font-medium text-ember-ink">
            Launch
          </span>
          <p className="text-sm font-medium text-ink-soft">Lifetime</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            $70<span className="text-base font-normal text-ink-faint"> once</span>
          </p>
          <p className="mt-2 text-[14px] text-ink-soft">One purchase. Yours forever.</p>
          <button
            className="btn-quiet mt-5 w-full"
            disabled={disabled || busy !== null}
            onClick={() => buy("lifetime")}
          >
            {busy === "lifetime" ? "Opening checkout…" : "Buy lifetime"}
          </button>
        </div>
      </div>

      {configured === false && (
        <p className="mt-4 rounded-xl border border-line bg-surface2/60 px-4 py-3 text-center text-[14px] text-ink-soft">
          Payments are not configured yet. Checkout opens here once Stripe keys are set.
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-[14px] text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
