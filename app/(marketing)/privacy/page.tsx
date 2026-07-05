import type { Metadata } from "next";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Daily Proof handles your data: locally, privately, and under your control.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <article className="prose-legal mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-[13.5px] text-ink-faint">Last updated: July 5, 2026</p>

      <h2 className="mt-10 font-display text-xl font-semibold">The short version</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Daily Proof is local-first. Your practices, sessions, and notes are stored in your own
        browser on your own device. We do not operate accounts, we do not run analytics or
        advertising trackers, and we cannot read your Book. Privacy is not a setting here — it is
        the architecture.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Data stored on your device</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Everything you create in Daily Proof — practices, focus sessions, proof entries, notes,
        settings, and your plan status — is saved in your browser&rsquo;s local database
        (IndexedDB). This data never leaves your device unless you export it yourself. Clearing
        your browser&rsquo;s site data will delete it, which is why the app includes a one-click
        backup export.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Backups and exports</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Backups are files generated on your device and saved wherever you choose. We never receive
        a copy. You are responsible for storing exported backups safely, since they contain your
        full Book in readable form.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Sharing</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Proof cards are images generated on your device, only when you ask for one. Sharing uses
        your operating system&rsquo;s share sheet; what happens after you share is governed by the
        platform you share to. Daily Proof never posts anything on its own and never uploads cards
        to our servers.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Payments</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        If you purchase a plan, payment is processed by Stripe. We never see or store your card
        details. Stripe shares with us only what is needed to confirm the purchase (such as the
        checkout status and plan). Stripe&rsquo;s own privacy policy governs their processing.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Accounts</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Daily Proof currently has no accounts. If optional accounts or sync are introduced in the
        future, they will be opt-in, this policy will be updated first, and local-only use will
        remain possible.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">What we don&rsquo;t do</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        No advertising. No selling or sharing of personal data. No third-party analytics trackers.
        No profiling. Standard technical logs kept by our hosting provider (such as request logs
        for reliability and abuse prevention) are the only server-side records related to your
        visit.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Your rights</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Because your data lives with you, access, portability, and deletion are in your hands:
        export from Settings at any time, and delete by clearing the app&rsquo;s data. For anything
        related to a purchase, contact us and we will help.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Contact</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Questions about privacy: <a className="underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </article>
  );
}
