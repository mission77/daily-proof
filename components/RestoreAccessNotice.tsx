import { SUPPORT_EMAIL } from "@/lib/site";

/** Self-service restore-by-email (see RestoreAccessForm.tsx) is fully built:
 *  Stripe is queried live for an eligible purchase, a short-lived signed
 *  link is emailed via Loops, and the confirm step re-verifies with Stripe
 *  before issuing a license. It isn't shown here because it can't be
 *  end-to-end tested without production's real Stripe and Loops
 *  credentials. Once that's been verified against live data, swap this for
 *  <RestoreAccessForm /> in both places it's used. */
export function RestoreAccessNotice() {
  return (
    <p className="text-[13px] text-ink-faint">
      Need to restore a purchase?{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 hover:text-ink">
        Contact support
      </a>
      .
    </p>
  );
}
