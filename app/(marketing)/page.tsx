import Link from "next/link";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Daily Proof — Collect proof that meaningful work happened",
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
};

const FAQS = [
  {
    q: "Can I use Daily Proof offline?",
    a: "Yes. Daily Proof is local-first: your practices and your Book live on your device, and the app works fully offline once installed. No connection is needed to focus or to save proof.",
  },
  {
    q: "Can I export my data?",
    a: "Yes, anytime. Settings includes a one-click backup that exports everything — practices, proof entries, and settings — as a single file you own, and you can import it on any device.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. The monthly plan can be cancelled at any time and remains active until the end of the billing period. Lifetime is a single purchase with nothing to cancel.",
  },
  {
    q: "What happens after my trial?",
    a: "After the 3-day trial you can choose monthly or lifetime to keep collecting proof. Everything you saved stays on your device either way, and you can always export your Book.",
  },
];

const FEATURES = [
  { title: "Focus Sessions", body: "One practice, one timer, everything else disappears. The session ends with a short written proof — what actually happened." },
  { title: "Book", body: "One day, one page. Your proof collects into a quiet journal you can read back — not a dashboard, not a chart." },
  { title: "Offline First", body: "Works with no connection at all. Install it once and Daily Proof is there on a plane, in a library, anywhere." },
  { title: "Private by Default", body: "No account. No tracking. No analytics watching over your shoulder. Your record belongs to you alone." },
  { title: "Export Anytime", body: "Your entire Book exports as a single file whenever you like. Import it anywhere. You are never locked in." },
  { title: "Beautiful Sharing", body: "After a session, optionally generate an elegant proof card — a quiet certificate of the work, ready for any platform." },
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
      { "@type": "Offer", price: "70", priceCurrency: "USD", name: "Lifetime (launch)" },
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
        <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-24 text-center sm:pt-32">
          <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[56px]">
            Collect proof that meaningful work&nbsp;happened<span className="wordmark-dot">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            Daily Proof helps you focus, finish meaningful work, and keep a private record of the
            work you actually did.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/studio" className="btn-primary w-full px-7 py-3 text-[16px] sm:w-auto">
              Start Free
            </Link>
            <Link href="#how" className="btn-quiet w-full px-7 py-3 text-[16px] sm:w-auto">
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-ink-faint">
            Free for 3 days · works offline · nothing leaves your device
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how" className="border-t border-line bg-surface2/40">
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
            Daily Proof is <strong className="font-semibold text-ink">not</strong> another habit
            tracker. Not another streak app. Not another productivity dashboard. Those tools measure
            you — chains to protect, graphs to feed, guilt when a day breaks.
          </p>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            Daily Proof is a record of showing up. You sit down, you do the work, and the work
            leaves evidence: what you did, how long, what happened. No badges pretending to be
            meaning. Just a growing, private record that you kept showing up for what matters.
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

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-4xl px-5 py-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-2 text-center text-[15px] text-ink-soft">Try everything free for 3 days.</p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <p className="text-sm font-medium text-ink-soft">Free</p>
              <p className="mt-1 font-display text-3xl font-semibold">3 days</p>
              <p className="mt-2 text-[14px] text-ink-soft">Every feature, no card required.</p>
              <Link href="/studio" className="btn-quiet mt-5 block w-full text-center">
                Start Free
              </Link>
            </div>
            <div className="card p-6">
              <p className="text-sm font-medium text-ink-soft">Premium</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                $7<span className="text-base font-normal text-ink-faint">/month</span>
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">Everything, as long as you need it.</p>
              <Link href="/pricing" className="btn-quiet mt-5 block w-full text-center">
                Choose monthly
              </Link>
            </div>
            <div className="card relative p-6">
              <span className="absolute right-4 top-4 rounded-full bg-ember/10 px-2.5 py-0.5 text-[12px] font-medium text-ember-ink">
                Launch
              </span>
              <p className="text-sm font-medium text-ink-soft">Lifetime</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                $70<span className="text-base font-normal text-ink-faint"> once</span>
              </p>
              <p className="mt-2 text-[14px] text-ink-soft">One purchase. Yours forever.</p>
              <Link href="/pricing" className="btn-primary mt-5 block w-full text-center">
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
          <dl className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <div key={f.q} className="card p-5">
                <dt className="font-display text-[16.5px] font-semibold">{f.q}</dt>
                <dd className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{f.a}</dd>
              </div>
            ))}
          </dl>
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
