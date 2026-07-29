"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyLicenseIfNotLower, effectiveRole, getAccessState, roleLabel } from "@/lib/repos/access";
import { StoredLicense } from "@/lib/types";
import { Wordmark } from "@/components/Wordmark";
import { SUPPORT_EMAIL } from "@/lib/site";

type State = "activating" | "ready" | "failed";

const FAILURE_MESSAGES: Record<string, string> = {
  missing_session_id:
    "We couldn't find your checkout session. If you completed a purchase, check your confirmation email or contact support.",
  invalid_session_id:
    "This checkout link isn't valid. If you completed a purchase, try reloading this page, or contact support.",
  invalid_body: "Something went wrong confirming your purchase. Please try reloading this page.",
  session_not_complete: "This checkout wasn't completed, so nothing was charged. You can try again from pricing.",
  unsupported_product:
    "This purchase couldn't be matched to a Daily Proof plan. If you were charged, contact support and it will be made right.",
  invalid_subscription:
    "We couldn't confirm an active subscription for this purchase. If you were charged, it will settle shortly — try reloading, or contact support.",
  incomplete_payment: "Payment wasn't completed, so nothing was charged.",
  not_configured: "Payments aren't available on this deployment right now.",
  stripe_unavailable: "We couldn't reach Stripe to confirm your purchase. Please try again in a moment.",
  rate_limited: "Too many attempts — please wait a moment and reload this page.",
};

const DEFAULT_FAILURE =
  "Your purchase could not be confirmed. If you were charged, it will settle shortly — try reloading, or reach out and it will be made right.";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("activating");
  const [planLabel, setPlanLabel] = useState<string>("");
  const [message, setMessage] = useState<string>(DEFAULT_FAILURE);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setMessage(FAILURE_MESSAGES.missing_session_id);
      setState("failed");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Server verifies directly with Stripe; the browser never determines
        // its own plan or role — it only receives the final signed license.
        const res = await fetch("/api/checkout/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setMessage(FAILURE_MESSAGES[data.reason] ?? DEFAULT_FAILURE);
          setState("failed");
          return;
        }

        const license: StoredLicense = {
          code: data.role === "lifetime" ? "stripe:lifetime" : "stripe:monthly",
          role: data.role,
          expiresAt: data.expiresAt ?? null,
          validatedAt: new Date().toISOString(),
          token: data.token,
        };
        // Never downgrades an existing Owner/Lifetime grant — safe to repeat
        // (refreshing this page just re-activates the same or better plan).
        // Only the signed token plus the role/expiry fields the access
        // repository already requires are kept — nothing else from the
        // activation response is stored.
        await applyLicenseIfNotLower(license);

        const finalState = await getAccessState();
        if (cancelled) return;
        setPlanLabel(roleLabel(effectiveRole(finalState)));
        setTrialEnd(typeof data.trialEnd === "string" ? data.trialEnd : null);
        setState("ready");
      } catch {
        if (!cancelled) {
          setMessage(FAILURE_MESSAGES.stripe_unavailable);
          setState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Wordmark className="text-xl" />
      {state === "activating" && (
        <p className="mt-6 text-[15px] text-ink-soft" aria-busy="true">
          Confirming your purchase…
        </p>
      )}
      {state === "ready" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">Daily Proof is ready.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{planLabel} is active on this device.</p>
          {trialEnd && (
            <p className="mt-1 text-[13.5px] text-ink-faint">
              Your first charge is {new Date(trialEnd).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              . Cancel anytime before then from Settings and you won&rsquo;t be charged.
            </p>
          )}
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-ink-faint">
            Your proof stays on this device only — nothing syncs automatically. Export a backup
            from Settings to protect or move it. You can cancel anytime from Settings.
          </p>
          <button className="btn-primary mt-7" onClick={() => router.push("/studio")}>
            Open Daily Proof
          </button>
        </>
      )}
      {state === "failed" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">Purchase not confirmed.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{message}</p>
          <p className="mt-4 text-[13px] text-ink-faint">
            Still stuck? Email{" "}
            <a className="underline underline-offset-2 hover:text-ink" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Link href="/upgrade" className="btn-primary mt-6">
            Back to pricing
          </Link>
        </>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
