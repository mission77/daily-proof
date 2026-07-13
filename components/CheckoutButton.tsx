"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Posts to the named Stripe route and redirects to Checkout. When checkout
 *  can't start (e.g. keys missing), production users are routed to the
 *  fallback (or shown a calm "temporarily unavailable") — never a message
 *  about configuration. */
export function CheckoutButton({
  plan,
  label,
  className = "btn-primary",
  fallbackHref,
}: {
  plan: "monthly" | "lifetime";
  label: string;
  className?: string;
  fallbackHref?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
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
      if (fallbackHref) {
        router.push(fallbackHref);
        return;
      }
      setError(
        process.env.NODE_ENV === "development" && res.status === 503
          ? "Payments are not configured yet (add Stripe env vars)."
          : "Checkout is temporarily unavailable. Please try again in a moment."
      );
    } catch {
      if (fallbackHref) router.push(fallbackHref);
      else setError("Checkout is temporarily unavailable. Please check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={go} disabled={busy}>
        {busy ? "Opening checkout…" : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-[13px] text-ink-soft" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
