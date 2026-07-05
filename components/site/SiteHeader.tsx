import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-6">
        <Link href="/" aria-label="Daily Proof home" className="rounded-md">
          <Wordmark className="text-lg" />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how" className="btn-ghost hidden sm:inline-flex">
            How it works
          </Link>
          <Link href="/pricing" className="btn-ghost">
            Pricing
          </Link>
          <Link href="/support" className="btn-ghost hidden sm:inline-flex">
            Support
          </Link>
          <Link href="/studio" className="btn-quiet ml-1 px-4 py-2 text-[14px]">
            Open the app
          </Link>
        </nav>
      </div>
    </header>
  );
}
