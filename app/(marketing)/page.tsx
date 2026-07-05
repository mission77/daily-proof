import Link from "next/link";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Daily Proof — Collect proof that meaningful work happened",
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
};

import { FAQS } from "@/lib/faqs";
import { FaqList } from "@/components/site/FaqList";

const FEATURES = [
  { title: "Finish what you started.", body: "One practice, one timer, everything else disappears — until the work is done and written down." },
  { title: "Remember what you actually did.", body: "One day, one page. A quiet journal you can read back, not a chart you have to feed." },
  { title: "Your focus doesn't need Wi-Fi.", body: "Install it once and it works anywhere — a plane, a library, a cabin with no signal." },
  { title: "Nobody is watching.", body: "No account. No tracking. No analytics over your shoulder. The record is yours alone." },
  { title: "Your work stays yours.", body: "Your entire Book exports as a single file, anytime. Import it anywhere. Never locked in." },
  { title: "Proof worth showing.", body: "When you want to, turn a session into an elegant proof card. When you don't, nothing asks." },
];

function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function AppJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Daily Proof",
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    offers: [
      { "@type": "Offer", price: "7", priceCurrency: "USD", name: "Premium (monthly)" },
      { "@type": "Offer", price: "70", priceCurrency: "USD", name: "Founding Member Lifetime (launch offer)" },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default function LandingPage() {
  return (
    <div>
      <FaqJsonLd />
      <AppJsonLd />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-ember/10 to-transparent"
        />
        <div className="mx-auto w-full max-w-3xl px-6 pb-16 pt-14 text-center sm:pb-24 sm:pt-24">
          <h1 className="mx-auto max-w-[15ch] font-display text-[38px] font-semibold leading-[1.1] tracking-tight sm:max-w-[22ch] sm:text-[52px]">
            Collect proof that meaningful work&nbsp;happened<span className="wordmark-dot">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[38ch] text-[16.5px] leading-relaxed text-ink-soft">
            Daily Proof helps you focus, finish meaningful work, and keep a private record of the
            work you actually did.
          </p>
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <Link href="/studio" className="btn-primary w-full px-8 py-4 text-[16px] sm:w-auto">
              Start Free
            </Link>
            <Link href="#how" className="btn-quiet w-full px-8 py-4 text-[16px] sm:w-auto">
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-[13px] text-ink-faint">
            3-day free trial · works offline · nothing leaves your device
          </p>

          {/* The product in five seconds */}
          <div
            aria-label="How Daily Proof works"
            className="mx-auto mt-9 flex max-w-md flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-ink-soft"
          >
            <span>Choose a practice</span>
            <span aria-hidden className="text-ember">→</span>
            <span>Start a session</span>
            <span aria-hidden className="text-ember">→</span>
            <span>Reflect</span>
            <span aria-hidden className="text-ember">→</span>
            <span className="font-medium text-ink">Your Book grows</span>
          </div>
        </div>
      </section>

      {/* ---------- Your Proof Book: what the app actually creates ---------- */}
      <section aria-labelledby="book-preview" className="overflow-x-clip border-t border-line">
        <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <h2 id="book-preview" className="text-center font-display text-3xl font-semibold">
            Your Proof Book
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-center text-[15px] leading-relaxed text-ink-soft">
            Every session becomes a page. One day, one page — quiet evidence of the work, in your
            own words.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3" aria-hidden>
            <div className="card -rotate-1 p-6 shadow-lg transition-transform duration-300 hover:rotate-0">
              <p className="font-display text-[16px] font-semibold">Monday, July 6</p>
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-semibold">Deep Work</p>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-faint">27 min · Ended early</p>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Reflection
                </p>
                <p className="mt-1 font-display text-[13.5px] italic leading-relaxed text-ink-soft">
                  Couldn&rsquo;t focus today. Started too late. Tomorrow starts earlier.
                </p>
              </div>
            </div>
            <div className="card p-6 shadow-lg transition-transform duration-300 md:mt-6">
              <p className="font-display text-[16px] font-semibold">Tuesday, July 7</p>
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-semibold">Reading</p>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-faint">38m · Completed · 22 pages</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                  Read and summarized one chapter.
                </p>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Reflection
                </p>
                <p className="mt-1 font-display text-[13.5px] italic leading-relaxed text-ink-soft">
                  Slow session, but the idea finally became clear.
                </p>
              </div>
            </div>
            <div className="card rotate-1 p-6 shadow-lg transition-transform duration-300 hover:rotate-0">
              <p className="font-display text-[16px] font-semibold">Wednesday, July 8</p>
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[15px] font-semibold">Training</p>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-faint">47m · Completed · 3 miles</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                  Finished the run without checking the phone.
                </p>
                <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Reflection
                </p>
                <p className="mt-1 font-display text-[13.5px] italic leading-relaxed text-ink-soft">
                  Not perfect, but honest effort.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- One honest page ---------- */}
      <section className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 text-center sm:py-24">
          <p className="font-display text-2xl font-semibold leading-relaxed sm:text-3xl">
            One honest page. Every day.
          </p>
          <p className="mx-auto mt-4 max-w-[34ch] text-[16px] leading-relaxed text-ink-soft">
            Years from now you&rsquo;ll remember what you actually built.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-t border-line">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">How it works</h2>
          <p className="mt-2 text-center text-[15px] text-ink-soft">Three simple steps.</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { n: "1", t: "Choose your practice.", b: "Name the work that matters — writing, deep work, an instrument, a craft." },
              { n: "2", t: "Focus.", b: "Start a session and everything else disappears. Just you, the work, and a timer counting up." },
              { n: "3", t: "Collect proof.", b: "Finish, note what happened, and save. A permanent page in your Book." },
            ].map((s) => (
              <li key={s.n} className="card p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 font-display text-[15px] font-semibold text-ember-ink">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Why Daily Proof ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-6">
          <h2 className="font-display text-3xl font-semibold">Why Daily Proof</h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">
            Not a habit tracker. Not a streak app. Not a dashboard. Those tools measure you —
            chains to protect, guilt when a day breaks.
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Daily Proof is a record of showing up. Do the work, and the work leaves evidence: what
            you did, how long, what happened. Nothing more.
          </p>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">Built for the work</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Share your proof ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-6">
          <div className="grid items-center gap-10 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold">Share your proof</h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
                After a session, Daily Proof can generate an elegant proof card — practice,
                duration, date, and a fitting line — designed like a certificate, not an
                advertisement. One tap opens your share sheet for Instagram, Stories, X, Threads,
                LinkedIn, or WhatsApp.
              </p>
              <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
                Sharing is optional, always. The app never interrupts you, never asks twice, and
                never posts anything on its own. The proof is for you first.
              </p>
            </div>
            {/* Elegant card mockup, drawn in the product's own language */}
            <div aria-hidden className="mx-auto w-full max-w-[300px]">
              <div className="card rotate-1 p-7 text-center shadow-lg">
                <p className="font-display text-[15px] font-semibold">
                  <span className="wordmark-daily">Daily</span> Proof
                  <span className="wordmark-dot">.</span>
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                  Proof of practice
                </p>
                <p className="mt-5 font-display text-2xl font-semibold">Deep work</p>
                <p className="mt-2 font-display text-4xl font-semibold">52 min</p>
                <p className="mt-2 text-[11px] text-ink-faint">Saturday, July 4</p>
                <div className="mx-auto mt-4 h-1.5 w-1.5 rounded-full bg-ember" />
                <p className="mt-3 font-display text-[12.5px] italic leading-relaxed text-ink-soft">
                  &ldquo;Proof over promises.&rdquo;
                </p>
                <p className="mt-5 text-[10px] text-ink-faint">dailyproofhq.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Emotional: planned vs finished ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-[22ch] font-display text-3xl font-semibold leading-snug sm:text-4xl">
            Most people remember what they planned. Successful people remember what they
            finished<span className="wordmark-dot">.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[44ch] text-[15.5px] leading-relaxed text-ink-soft">
            A to-do list is a promise. Daily Proof is a receipt. When the session ends, what
            remains isn&rsquo;t a checked box — it&rsquo;s a record: what you worked on, how long
            you stayed, and what actually happened. Read it back in a month and you won&rsquo;t
            wonder whether you&rsquo;re making progress. You&rsquo;ll have proof.
          </p>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-2 text-center text-[15px] text-ink-soft">Try everything free for 3 days.</p>
          <div className="mx-auto mt-12 grid max-w-3xl items-start gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <p className="text-sm font-medium text-ink-soft">Free trial</p>
              <p className="mt-1 font-display text-3xl font-semibold">3 days</p>
              <p className="mt-2 text-[14px] text-ink-soft">
                Every feature. Card required; cancel anytime during the trial.
              </p>
              <Link href="/pricing" className="btn-quiet mt-5 block w-full text-center">
                Start Free
              </Link>
            </div>
            <div className="card relative p-6 shadow-lg ring-1 ring-ember/40 sm:-mt-3 sm:pb-8">
              <span className="absolute right-4 top-4 rounded-full bg-ember/10 px-2.5 py-0.5 text-[12px] font-medium text-ember-ink">
                Most flexible
              </span>
              <p className="text-sm font-medium text-ink-soft">Premium</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                $7<span className="text-base font-normal text-ink-faint">/month</span>
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">
                After your 3-day trial. Cancel anytime.
              </p>
              <Link href="/pricing" className="btn-primary mt-5 block w-full text-center">
                Start free trial
              </Link>
            </div>
            <div className="card relative p-6">
              <span className="absolute right-4 top-4 rounded-full bg-ember/10 px-2.5 py-0.5 text-[12px] font-medium text-ember-ink">
                Launch
              </span>
              <p className="text-sm font-medium text-ink-soft">Founding Member Lifetime</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                $70<span className="text-base font-normal text-ink-faint"> once</span>
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">
                One purchase, yours forever. Limited-time launch offer.
              </p>
              <Link href="/pricing" className="btn-quiet mt-5 block w-full text-center">
                Get lifetime
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">Questions, answered</h2>
          <div className="mt-10">
            <FaqList />
          </div>
          <div className="mt-12 text-center">
            <Link href="/studio" className="btn-primary px-8 py-3 text-[16px]">
              Begin your first page
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
