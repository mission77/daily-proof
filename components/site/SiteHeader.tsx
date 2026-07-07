"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { BETA_MODE } from "@/lib/site";

const NAV = BETA_MODE
  ? [
      { href: "/#how", label: "How It Works" },
      { href: "/support", label: "Support" },
    ]
  : [
      { href: "/#how", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/support", label: "Support" },
    ];
const CTA = BETA_MODE
  ? { href: "/#beta", label: "Request Invitation" }
  : { href: "/studio", label: "Open the App" };

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape; lock body scroll while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-6">
        <Link href="/" aria-label="Daily Proof home" className="rounded-md" onClick={() => setOpen(false)}>
          <Wordmark className="text-lg" />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="btn-ghost">
              {l.label}
            </Link>
          ))}
          <Link href={CTA.href} className="btn-quiet ml-1 px-4 py-2 text-[14px]">
            {CTA.label}
          </Link>
        </nav>

        {/* Mobile: single clean hamburger */}
        <button
          className="btn-ghost -mr-2 p-2 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile slide-in menu — portaled to <body>: the header's backdrop-blur
          creates a containing block that would otherwise trap this fixed
          overlay inside the 64px bar. */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 overflow-hidden md:hidden ${open ? "" : "pointer-events-none"}`}
            aria-hidden={!open}
          >
        <div
          className={`absolute inset-0 bg-black/35 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className={`absolute right-0 top-0 flex h-full w-[78%] max-w-xs flex-col border-l border-line bg-bg px-6 pb-8 pt-5 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Wordmark className="text-base" />
            <button className="btn-ghost -mr-2 p-2" aria-label="Close menu" onClick={() => setOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-8 flex flex-col gap-1">
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 font-display text-xl font-medium transition-colors hover:bg-surface2"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <Link
            href={CTA.href}
            onClick={() => setOpen(false)}
            className="btn-primary mt-auto w-full py-3.5 text-[16px]"
          >
            {CTA.label}
          </Link>
          </nav>
          </div>,
          document.body
        )}
    </header>
  );
}
