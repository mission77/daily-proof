"use client";

import { useState } from "react";
import { AccessState } from "@/lib/types";
import { applyLicense, roleLabel } from "@/lib/repos/access";

/** The one place a code gets redeemed: server validation via
 *  /api/license/validate, then the license is stored locally. Used by the
 *  access lock screen and by Settings → Access. */
export function AccessCodeForm({
  onSuccess,
}: {
  onSuccess: (state: AccessState, roleName: string) => void;
}) {
  const [codeInput, setCodeInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function redeemCode() {
    const code = codeInput.trim();
    if (!code || redeeming) return;
    setRedeeming(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/license/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 503) {
        setCodeError("Access codes aren't enabled on this deployment yet.");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.valid) {
        const reasons: Record<string, string> = {
          malformed: "That doesn't look like a Daily Proof code. Check for typos.",
          invalid_signature: "This code isn't valid.",
          expired: "This code has expired.",
          exhausted: "This code has already been used the maximum number of times.",
          revoked: "This code is no longer active.",
          past_due: "This code is no longer active.",
        };
        setCodeError(reasons[data.reason] ?? "This code couldn't be validated.");
        return;
      }
      const next = await applyLicense({
        code: code.toUpperCase(),
        role: data.role,
        expiresAt: data.expiresAt ?? null,
        validatedAt: new Date().toISOString(),
      });
      setCodeInput("");
      onSuccess(next, roleLabel(data.role));
    } catch {
      setCodeError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="s-code"
          className="field flex-1 uppercase placeholder:normal-case"
          placeholder="e.g. BETA-XXXXXXXXX-XXXXXXXXXX"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && redeemCode()}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className="btn-quiet shrink-0"
          onClick={redeemCode}
          disabled={redeeming || codeInput.trim().length === 0}
        >
          {redeeming ? "Checking…" : "Redeem"}
        </button>
      </div>
      {codeError && (
        <p className="mt-2 text-[13px] text-red-500" role="alert">
          {codeError}
        </p>
      )}
    </div>
  );
}
