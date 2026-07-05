import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "Help with Daily Proof: common answers and how to reach us.",
  alternates: { canonical: `${SITE_URL}/support` },
};

const TOPICS = [
  {
    q: "My data disappeared",
    a: "Daily Proof stores everything in your browser's site data. If it was cleared (privacy cleanup, browser reset, a different browser or profile), the app starts empty. Restore from a backup in Settings → Import. Going forward, export a backup regularly — it takes one click.",
  },
  {
    q: "Installing the app",
    a: "Daily Proof is an installable web app. On iPhone: open it in Safari, tap Share, then Add to Home Screen. On Android and desktop Chrome: use the install icon in the address bar. Once installed it works fully offline.",
  },
  {
    q: "Moving to a new device",
    a: "Export a backup on the old device (Settings → Backup → Export), send the file to the new device, then Settings → Import. Everything comes across: practices, your Book, and settings.",
  },
  {
    q: "Billing questions",
    a: "Cancellations take effect at the end of the paid period, and our refund policy covers the rest. Email us with your receipt and we'll sort it quickly.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Support</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Most questions are answered below. For anything else, email{" "}
        <a className="underline underline-offset-2" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{" "}
        — a human reads every message, usually within one business day.
      </p>
      <dl className="mt-10 space-y-3">
        {TOPICS.map((t) => (
          <div key={t.q} className="card p-5">
            <dt className="font-display text-[16.5px] font-semibold">{t.q}</dt>
            <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{t.a}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-[14px] text-ink-soft">
        See also: <Link className="underline underline-offset-2" href="/privacy">Privacy</Link> ·{" "}
        <Link className="underline underline-offset-2" href="/terms">Terms</Link> ·{" "}
        <Link className="underline underline-offset-2" href="/refunds">Refund Policy</Link>
      </p>
    </div>
  );
}
