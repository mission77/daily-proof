"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { setAccessRole, setStripeCustomerId } from "@/lib/repos/access";
import { Wordmark } from "@/components/Wordmark";

type State = "verifying" | "unlocked" | "failed";

function SuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("verifying");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState("failed");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Payment is confirmed server-side; the redirect alone is never trusted.
        const res = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.paid) {
          await setAccessRole(data.plan === "lifetime" ? "lifetime" : "premium");
          if (data.customerId) await setStripeCustomerId(data.customerId);
          setState("unlocked");
          setTimeout(() => router.replace("/studio"), 1600);
        } else {
          setState("failed");
        }
      } catch {
        if (!cancelled) setState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Wordmark className="text-xl" />
      {state === "verifying" && (
        <p className="mt-6 text-[15px] text-ink-soft" aria-busy="true">
          Confirming your purchase…
        </p>
      )}
      {state === "unlocked" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">You&rsquo;re in.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Taking you back to your Studio.</p>
        </>
      )}
      {state === "failed" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">Purchase not confirmed.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            The payment could not be verified. If you were charged, it will settle shortly — try
            reloading this page, or reach out and it will be made right.
          </p>
          <Link href="/upgrade" className="btn-primary mt-6">
            Back to pricing
          </Link>
        </>
      )}
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  );
}
