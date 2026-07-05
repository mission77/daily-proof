import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { PlanPicker } from "@/components/PlanPicker";

export const metadata = { title: "Upgrade — Daily Proof" };

export default function UpgradePage({
  searchParams,
}: {
  searchParams?: { canceled?: string };
}) {
  const canceled = searchParams?.canceled === "1";
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Link href="/studio" aria-label="Back to Studio" className="rounded-md">
          <Wordmark className="text-xl" />
        </Link>
        <Link href="/studio" className="btn-ghost">
          Back to Studio
        </Link>
      </header>
      <main className="flex flex-1 flex-col justify-center py-10">
        {canceled && (
          <p className="mx-auto mb-6 rounded-xl border border-line bg-surface2/60 px-4 py-2.5 text-center text-[14px] text-ink-soft">
            Checkout was cancelled — nothing was charged. Whenever you&rsquo;re ready.
          </p>
        )}
        <h1 className="text-center font-display text-[26px] font-semibold leading-tight sm:text-3xl">
          Simple pricing
        </h1>
        <p className="mt-2 text-center text-[15px] text-ink-soft">
          Try everything free for 3 days.
        </p>
        <div className="mt-8">
          <PlanPicker />
        </div>
      </main>
    </div>
  );
}
