"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyLicenseIfNotLower, effectiveRole, getAccessState, roleLabel } from "@/lib/repos/access";
import { StoredLicense } from "@/lib/types";
import { Wordmark } from "@/components/Wordmark";
import { SUPPORT_EMAIL } from "@/lib/site";

type State = "restoring" | "ready" | "failed";

const FAILURE_MESSAGES: Record<string, string> = {
  missing_token: "This restore link is incomplete. Request a new one from the access screen.",
  invalid_or_expired_link:
    "This restore link has expired or was already used. Restore links are valid for 20 minutes — request a new one.",
  no_active_purchase:
    "We couldn't find an active Daily Proof purchase for this link. If you believe this is wrong, contact support.",
  not_configured: "Restoring access isn't available on this deployment right now.",
  stripe_unavailable: "We couldn't reach Stripe to confirm your purchase. Please try again in a moment.",
  rate_limited: "Too many attempts — please wait a moment and try again.",
  invalid_body: "Something went wrong confirming this link. Please try reloading this page.",
};
const DEFAULT_FAILURE = "This restore link couldn't be confirmed. Request a new one from the access screen.";

function ConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("restoring");
  const [planLabel, setPlanLabel] = useState("");
  const [message, setMessage] = useState(DEFAULT_FAILURE);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setMessage(FAILURE_MESSAGES.missing_token);
      setState("failed");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Server re-verifies live against Stripe; the browser only ever
        // receives the final signed license, exactly like checkout activation.
        const res = await fetch("/api/access/restore/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
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
        await applyLicenseIfNotLower(license);

        const finalState = await getAccessState();
        if (cancelled) return;
        setPlanLabel(roleLabel(effectiveRole(finalState)));
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
      {state === "restoring" && (
        <p className="mt-6 text-[15px] text-ink-soft" aria-busy="true">
          Restoring access…
        </p>
      )}
      {state === "ready" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">Access restored.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{planLabel} is active on this device.</p>
          <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-faint">
            This restored your plan, not your proof — proof only ever lived on the device that
            created it. If you have a backup file from that device, import it from Settings →
            Backup.
          </p>
          <button className="btn-primary mt-7" onClick={() => router.push("/studio")}>
            Open Daily Proof
          </button>
        </>
      )}
      {state === "failed" && (
        <>
          <h1 className="mt-6 font-display text-2xl font-semibold">Access not restored.</h1>
          <p className="mt-2 text-[15px] text-ink-soft">{message}</p>
          <p className="mt-4 text-[13px] text-ink-faint">
            Still stuck? Email{" "}
            <a className="underline underline-offset-2 hover:text-ink" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Link href="/settings" className="btn-primary mt-6">
            Back to Settings
          </Link>
        </>
      )}
    </div>
  );
}

export default function RestoreConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
