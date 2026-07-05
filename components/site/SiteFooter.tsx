import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refund Policy" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-5 text-center">
          <Wordmark className="text-lg" />
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13.5px] text-ink-soft transition-colors hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="text-[13px] text-ink-faint">
            © {new Date().getFullYear()} Daily Proof · Local-first. Calm by design. · dailyproofhq.com
          </p>
        </div>
      </div>
    </footer>
  );
}
