import type { Metadata } from "next";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Daily Proof.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-[13.5px] text-ink-faint">Last updated: July 5, 2026</p>

      <h2 className="mt-10 font-display text-xl font-semibold">1. The service</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Daily Proof is a local-first web application for running focused work sessions and keeping
        a private record of them. It is operated by Daily Proof (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) at dailyproofhq.com. By using the app or website you agree to these
        terms.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">2. Your data, your device</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Your content is stored on your device, not on our servers. You own it entirely. Because we
        hold no copy, we cannot recover data lost through cleared browser storage, lost devices, or
        deleted backups — the app&rsquo;s export feature exists so you can protect yourself, and we
        strongly recommend regular backups.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">3. Plans and billing</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Daily Proof offers a 3-day free trial (a payment card is required to start it), a monthly
        subscription ($7/month), and a one-time Founding Member Lifetime purchase ($70, a
        limited-time launch offer). Payments are processed by Stripe. The monthly subscription
        begins automatically when the trial ends unless cancelled beforehand; cancelling during
        the trial is free. Subscriptions renew automatically until cancelled; cancellation stops
        future charges and access continues to the end of the paid period. Prices may change with
        notice; changes never affect an already-purchased lifetime plan.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">4. Acceptable use</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Don&rsquo;t abuse, disrupt, or attempt to break the service, resell it as your own, or use
        it for unlawful purposes. That&rsquo;s the whole list.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">5. Availability and changes</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        We aim to keep the service available and improving, but it is provided &ldquo;as
        is&rdquo; without warranties of uninterrupted availability. Because the app is local-first
        and installable, it keeps working offline even when the website is unreachable. We may
        update features over time; we will not remove your ability to export your data.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">6. Liability</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        To the maximum extent permitted by law, our total liability for any claim related to the
        service is limited to the amount you paid us in the twelve months before the claim. We are
        not liable for indirect or consequential damages, including loss of locally stored data.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">7. Termination</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        You can stop using Daily Proof at any time; your local data remains yours to keep or
        delete. We may suspend access for violations of these terms.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">8. Contact</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Questions about these terms: <a className="underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </article>
  );
}
