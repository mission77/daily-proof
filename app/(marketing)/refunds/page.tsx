import type { Metadata } from "next";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Daily Proof's simple, fair refund policy.",
  alternates: { canonical: `${SITE_URL}/refunds` },
};

export default function RefundsPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Refund Policy</h1>
      <p className="mt-2 text-[13.5px] text-ink-faint">Last updated: July 5, 2026</p>

      <p className="mt-8 leading-relaxed text-ink-soft">
        The 3-day free trial exists so you can decide before paying anything. Beyond that, we keep
        refunds simple and human.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Lifetime purchases</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        If the lifetime plan isn&rsquo;t right for you, email us within 14 days of purchase and we
        will refund it in full — no questionnaire, no hoops.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Monthly subscriptions</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        You can cancel at any time and keep access until the end of the paid month; future charges
        stop immediately. If a renewal charged you unexpectedly, contact us within 7 days of that
        charge and we will refund it.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">How to request a refund</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Email <a className="underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from
        the address used at checkout, with your Stripe receipt if you have it handy. Refunds are
        returned to the original payment method, typically within 5–10 business days depending on
        your bank.
      </p>

      <p className="mt-8 leading-relaxed text-ink-soft">
        Your data is unaffected by refunds either way — it lives on your device and remains
        exportable.
      </p>
    </article>
  );
}
