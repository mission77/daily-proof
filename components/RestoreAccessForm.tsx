"use client";

import { useState } from "react";
import { SUPPORT_EMAIL } from "@/lib/site";

const FAILURE_MESSAGES: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  rate_limited: "Too many attempts — please wait a few minutes and try again.",
  not_configured: `Self-service restore isn't available right now — email ${SUPPORT_EMAIL} and it'll be sorted out directly.`,
};
const DEFAULT_FAILURE = "Couldn't reach the server. Check your connection and try again.";

/** Self-service restore for someone who lost local access (cleared storage,
 *  new device, reinstall) but still has a valid purchase. Enters an email,
 *  the server checks Stripe, and — without ever confirming whether that
 *  email matched anything — a restore link may be sent. Used on the access
 *  lock screen and in Settings → Access. */
export function RestoreAccessForm({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const trimmed = email.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/access/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(FAILURE_MESSAGES[data.reason] ?? DEFAULT_FAILURE);
        return;
      }
      setSent(true);
    } catch {
      setError(DEFAULT_FAILURE);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" aria-live="polite">
        <p className="text-[14px] font-medium">Check your email.</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
          If {email.trim()} has an active Daily Proof purchase, a restore link is on its way. It
          expires in 20 minutes. Restoring access does not restore your proof — that only ever
          lived on your previous device, and export/import is the only way to move it (see
          Settings → Backup).
        </p>
        {onClose && (
          <button className="btn-ghost mt-3" onClick={onClose}>
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="restore-email" className="text-[13.5px] font-medium text-ink-soft">
        Restore access by email
      </label>
      <p className="mt-1 text-[12.5px] text-ink-faint">
        For a subscription or lifetime purchase on a new device. This restores access only — your
        proof stays on the device it was created on unless you export and import it.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="restore-email"
          type="email"
          className="field flex-1"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          autoComplete="email"
        />
        <button className="btn-quiet shrink-0" onClick={send} disabled={sending || email.trim().length === 0}>
          {sending ? "Sending…" : "Send restore link"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[13px] text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
