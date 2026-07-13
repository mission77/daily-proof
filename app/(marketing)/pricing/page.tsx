import type { Metadata } from "next";
import Link from "next/link";
import { PlanPicker } from "@/components/PlanPicker";
import { BETA_MODE } from "@/lib/site";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start a 3-day trial (card required, then $7/month) — or $70 once as a Founding Member, for life.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function PricingPage() {
  if (BETA_MODE) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl font-semibold">Founding Beta</h1>
        <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-soft">
          Daily Proof isn&rsquo;t on sale yet. A small Founding Beta opens in the coming days —
          members receive early access and founder pricing before the public launch.
        </p>
        <Link href="/#beta" className="btn-primary mt-8 inline-flex px-8 py-3.5 text-[16px]">
          Request Early Access
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-6">
      <h1 className="text-center font-display text-4xl font-semibold">Simple pricing</h1>
      <p className="mt-3 text-center text-[15.5px] text-ink-soft">
        Every plan includes everything: focus sessions, the Book, offline use, backups, and
        sharing. The monthly plan starts with a 3-day trial — card required, then $7/month unless
        canceled. Canceling during the trial costs nothing.
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
