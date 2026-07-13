"use client";

import { useEffect, useState } from "react";

type Plan = "monthly" | "lifetime";
const IS_DEV = process.env.NODE_ENV === "development";

/** Two plans, honest terms, Monthly primary. Routes to the named Stripe
 *  endpoints. When keys are missing: development shows the configuration
 *  note; production shows a calm "temporarily unavailable" only on click. */
export function PlanPicker() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/checkout")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));
  }, []);

  async function buy(plan: Plan) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch(plan === "monthly" ? "/api/stripe/checkout" : "/api/stripe/lifetime", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(
        IS_DEV && res.status === 503
          ? "Payments are not configured yet (add Stripe env vars)."
          : "Checkout is temporarily unavailable. Please try again in a moment."
      );
    } catch {
      setError("Checkout is temporarily unavailable. Please check your connection.");
    } finally {
      setBusy(null);
    }
  }

  const devDisabled = IS_DEV && configured === false;

  return (
    <div>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <div className="card relative p-6 shadow-lg ring-1 ring-ember/40 sm:-mt-2 sm:pb-8">
          <span className="absolute right-4 top-4 rounded-full bg-ember/10 px-2.5 py-0.5 text-[12px] font-medium text-ember-ink">
            Recommended
          </span>
          <p className="text-sm font-medium text-ink-soft">Monthly</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            $7<span className="text-base font-normal text-ink-faint">/month</span>
          </p>
          <p className="mt-2 text-[14px] text-ink-soft">
            Includes 3-day trial. Card required. Then $7/month unless canceled.
          </p>
          <button
            className="btn-primary mt-5 w-full"
            disabled={devDisabled || busy !== null}
            onClick={() => buy("monthly")}
          >
            {busy === "monthly" ? "Opening checkout…" : "Start 3-day trial"}
          </button>
        </div>
        <div className="card p-6">
          <p className="text-sm font-medium text-ink-soft">Lifetime</p>
          <p className="mt-1 font-display text-3xl font-semibold">
            $70<span className="text-base font-normal text-ink-faint"> once</span>
          </p>
          <p className="mt-2 text-[14px] text-ink-soft">
            Founding Member Lifetime. One purchase, yours forever.
          </p>
          <button
            className="btn-quiet mt-5 w-full"
            disabled={devDisabled || busy !== null}
            onClick={() => buy("lifetime")}
          >
            {busy === "lifetime" ? "Opening checkout…" : "Buy lifetime"}
          </button>
        </div>
      </div>

      {devDisabled && (
        <p className="mt-4 rounded-xl border border-line bg-surface2/60 px-4 py-3 text-center text-[14px] text-ink-soft">
          Payments are not configured yet. Checkout opens here once Stripe keys are set. (Shown in
          development only.)
        </p>
      )}
      {error && (
        <p className="mt-4 text-center text-[14px] text-ink-soft" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
