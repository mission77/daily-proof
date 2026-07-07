import type { Metadata } from "next";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Daily Proof keeps your work private and under your control.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <article className="prose-legal mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-[13.5px] text-ink-faint">Last updated: July 7, 2026</p>

      <h2 className="mt-10 font-display text-xl font-semibold">The short version</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Daily Proof was built to be private. Your work belongs to you. We do
        not sell your data, track your activity, or build profiles about how
        you work.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Your data</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Everything you create in Daily Proof stays on your device. This
        includes your practices, focus sessions, reflections, notes, and your
        Proof Book.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Backups and exports</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        You can export your work whenever you want. Your backups are created on
        your device and remain under your control.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Sharing</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Nothing is shared unless you choose to share it. Daily Proof never
        publishes your work or sends it anywhere without your action.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Payments</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        If you purchase a plan in the future, payments will be securely
        processed by Stripe. We never receive or store your payment details.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Accounts</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        During beta, Daily Proof does not require an account to use the app.
        If optional accounts are introduced in the future, they will always be
        optional and this policy will be updated first.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">What we don't do</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        We do not sell personal information. We do not use advertising
        trackers. We do not profile your behavior. Privacy is part of how Daily
        Proof is designed.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Your control</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Your work is yours. You can export it, keep it, or delete it whenever
        you choose.
      </p>

      <h2 className="mt-10 font-display text-xl font-semibold">Contact</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Questions about privacy:{" "}
        <a
          className="underline underline-offset-2"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </article>
  );
}