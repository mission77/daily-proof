import Image from "next/image";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/site";
import { FAQS } from "@/lib/faqs";
import { FaqList } from "@/components/site/FaqList";
import { BetaForm } from "@/components/site/BetaForm";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Daily Proof — Collect proof that meaningful work happened",
  description:
    "A private place to focus, reflect, and build a book of your real work. The first Founding Beta opens in a few days.",
  alternates: { canonical: SITE_URL },
};

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
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/** A product screenshot in a quiet device-like frame. */
function Screen({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      <Image src={src} alt={alt} width={840} height={1560} priority={priority} className="h-auto w-full" />
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Create a Practice",
    copy: "Choose something meaningful. Qur'an study. Writing. Deep work. Reading. Running. Anything worth showing up for.",
    src: "/screens/create.png",
    alt: "Creating a practice in Daily Proof",
  },
  {
    n: "2",
    title: "Focus",
    copy: "Start a distraction-free session. One session. One intention.",
    src: "/screens/focus.png",
    alt: "The Daily Proof focus timer during a session",
  },
  {
    n: "3",
    title: "Reflect",
    copy: "Write a few honest thoughts while they're still fresh. Capture what mattered.",
    src: "/screens/finish.png",
    alt: "Reflecting after a finished session",
  },
  {
    n: "4",
    title: "Build Your Proof Book",
    copy: "Every completed session becomes another page of your progress. No streak pressure. No social validation. Just honest evidence.",
    src: "/screens/book.png",
    alt: "The Proof Book showing a day of saved sessions",
  },
];

const PRIVACY_CARDS = [
  { title: "No Account Required", body: "Daily Proof works without creating an account." },
  { title: "No Tracking", body: "Your work isn't analyzed, profiled or sold." },
  { title: "Local First", body: "Your data stays on your own device." },
  { title: "You Own Your Work", body: "Export your Proof Book whenever you want." },
];

export default function LandingPage() {
  return (
    <div>
      <FaqJsonLd />
      <AppJsonLd />

      {/* ---------- 1 · Hero ---------- */}
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-ember/10 to-transparent"
        />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="mx-auto max-w-[15ch] font-display text-[38px] font-semibold leading-[1.1] tracking-tight sm:max-w-[22ch] sm:text-[52px]">
            Collect proof that meaningful work&nbsp;happened<span className="wordmark-dot">.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-soft">
            Daily Proof is a private place to focus, reflect, and build a book of your real work.
          </p>
          <p className="mt-3 text-[14px] font-medium text-ember-ink">
            Opening the first Founding Beta in a few days.
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <a href="#beta" className="btn-primary w-full px-8 py-4 text-[16px] sm:w-auto">
              Request Beta Invitation
            </a>
            <a href="#how" className="btn-quiet w-full px-8 py-4 text-[16px] sm:w-auto">
              See How It Works
            </a>
          </div>
        </div>
        <p className="pb-8 text-center text-[13px] text-ink-faint" aria-hidden>
          Scroll to see how it works ↓
        </p>
      </section>
      {/* ---------- 2 · Why I Built Daily Proof ---------- */}
<section className="border-t border-line">
  <div className="mx-auto grid w-full max-w-4xl items-center gap-12 px-6 py-20 sm:grid-cols-2 sm:py-28">
    <Reveal>
      <h2 className="font-display text-3xl font-semibold">Why Daily Proof Exists</h2>

      <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-soft">
        <p>Most productivity tools create more noise instead of more focus.</p>

        <p>
          Sometimes all you need is one quiet place to focus, think, and keep
          proof that meaningful work actually happened.
        </p>

        <p>
          That is what I was looking for too. A timer that kept me honest, one
          private place for my reflections, and a simple record of what I
          actually finished.
        </p>

        <p>So I built Daily Proof.</p>

        <p className="font-medium text-ink">
          No social feed. No pressure. Just honest proof.
        </p>
      </div>
          </Reveal>
          <Reveal>
            <Screen src="/screens/studio.png" alt="The Daily Proof Studio with today's focus" />
          </Reveal>
        </div>
      </section>

      {/* ---------- 3 · How It Works ---------- */}
      <section id="how" className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <h2 className="text-center font-display text-3xl font-semibold">How It Works</h2>
          <div className="mt-14 space-y-16 sm:space-y-20">
            {STEPS.map((s, i) => (
              <Reveal key={s.n}>
                <div
                  className={`grid items-center gap-8 sm:grid-cols-2 sm:gap-12 ${
                    i % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div className="text-center sm:text-left">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 font-display text-[15px] font-semibold text-ember-ink">
                      {s.n}
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-semibold">{s.title}</h3>
                    <p className="mx-auto mt-2.5 max-w-[40ch] text-[15.5px] leading-relaxed text-ink-soft sm:mx-0">
                      {s.copy}
                    </p>
                  </div>
                  <Screen src={s.src} alt={s.alt} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4 · Private by Design ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <h2 className="text-center font-display text-3xl font-semibold">Private by Design</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {PRIVACY_CARDS.map((c) => (
              <Reveal key={c.title}>
                <div className="card h-full p-6">
                  <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 5 · Founding Beta ---------- */}
      <section id="beta" className="border-t border-line bg-surface2/40 scroll-mt-16">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <h2 className="text-center font-display text-3xl font-semibold">Founding Beta</h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-center text-[15.5px] leading-relaxed text-ink-soft">
            Daily Proof is almost ready. Before opening it publicly, I&rsquo;m inviting a small
            group of people to help shape the first version.
          </p>
          <ul className="mx-auto mt-7 max-w-sm space-y-2.5 text-[15px] text-ink-soft">
            {[
              "Early access before public launch",
              "Direct influence on the product",
              "A personal invitation to the first beta",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <BetaForm />
          </div>
        </div>
      </section>

      {/* ---------- 6 · FAQ ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-24">
          <h2 className="text-center font-display text-3xl font-semibold">Questions, answered</h2>
          <div className="mt-10">
            <FaqList />
          </div>
          <div className="mt-12 text-center">
            <a href="#beta" className="btn-primary px-8 py-3 text-[16px]">
              Request Beta Invitation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
