"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { AccessGuard } from "@/components/AccessGuard";

const TABS = [
  { href: "/studio", label: "Studio" },
  { href: "/book", label: "Book" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/studio" className="rounded-md" aria-label="Daily Proof — Studio">
            <Wordmark className="text-xl" />
          </Link>
          <nav className="hidden gap-1 sm:flex" aria-label="Main">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-surface2 text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-12">
        <AccessGuard>{children}</AccessGuard>
      </main>

      {/* Bottom nav on phones keeps primary navigation reachable */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[13px] font-medium ${
                  active ? "text-ink" : "text-ink-faint"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${active ? "bg-ember" : "bg-transparent"}`}
                  aria-hidden
                />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
