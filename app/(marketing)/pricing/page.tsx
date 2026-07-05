import type { Metadata } from "next";
import Link from "next/link";
import { PlanPicker } from "@/components/PlanPicker";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Try Daily Proof free for 3 days (card required), then $7/month — or $70 once as a Founding Member, for life.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-6">
      <h1 className="text-center font-display text-4xl font-semibold">Simple pricing</h1>
      <p className="mt-3 text-center text-[15.5px] text-ink-soft">
        Every plan includes everything: focus sessions, the Book, offline use, backups, and sharing.
        Start with a 3-day free trial. A card is required and the subscription begins automatically when the trial ends — cancelling during the trial is free.
      </p>
      <div className="mt-10">
        <PlanPicker />
      </div>
      <p className="mt-8 text-center text-[13.5px] text-ink-faint">
        Prefer to try first?{" "}
        <Link href="/studio" className="underline underline-offset-2 hover:text-ink">
          Open the app
        </Link>{" "}
        and begin your trial. Your proof stays on your device either way.
      </p>
    </div>
  );
}
