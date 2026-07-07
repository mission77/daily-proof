import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "Contact Daily Proof support.",
  alternates: { canonical: `${SITE_URL}/support` },
};

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Support</h1>

      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        Need help with Daily Proof?
      </p>

      <p className="mt-6 leading-relaxed text-ink-soft">
        Most questions about Daily Proof are answered on the{" "}
        <Link
          href="/#how"
          className="underline underline-offset-2"
        >
          How It Works
        </Link>{" "}
        page.
      </p>

      <p className="mt-6 leading-relaxed text-ink-soft">
        If you still need help, send an email.
      </p>

      <div className="card mt-8 p-6">
        <h2 className="font-display text-xl font-semibold">Email</h2>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-3 block text-lg underline underline-offset-2"
        >
          {SUPPORT_EMAIL}
        </a>

        <p className="mt-4 text-ink-soft leading-relaxed">
          I personally read every email and aim to reply within one business
          day.
        </p>
      </div>
    </div>
  );
}
