import type { Metadata } from "next";
import { SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Daily Proof.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 text-center sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Contact</h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
        Daily Proof is built by a small team that reads everything. Questions, billing, feedback,
        or just to say the app helped — one address covers it all:
      </p>
      <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-primary mt-8 inline-flex px-7 py-3 text-[16px]">
        {SUPPORT_EMAIL}
      </a>
      <p className="mt-6 text-[13.5px] text-ink-faint">Replies typically within one business day.</p>
    </div>
  );
}
