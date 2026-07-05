import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/#how", label: "How it Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/studio", label: "Open the App" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/support", label: "Support" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refund Policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <Wordmark className="text-lg" />
            <p className="mt-3 max-w-[24ch] text-[13.5px] leading-relaxed text-ink-faint">
              A quiet place to collect proof that meaningful work happened.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
                {col.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[14px] text-ink-soft transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-center text-[13px] text-ink-faint">
          © {new Date().getFullYear()} Daily Proof · Local-first. Calm by design. · dailyproofhq.com
        </p>
      </div>
    </footer>
  );
}
