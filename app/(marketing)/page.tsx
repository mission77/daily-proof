import Image from "next/image";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { FAQS } from "@/lib/faqs";
import { FaqList } from "@/components/site/FaqList";
import { PlanPicker } from "@/components/PlanPicker";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Daily Proof — Collect proof that meaningful work happened",
  description:
    "A private place to focus, reflect, and keep proof of the work you actually did. Local-first, no account, no cloud backup — just an honest record.",
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
    description:
      "A private, local-first place to focus, reflect, and keep proof of meaningful work — no account, no cloud backup.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "7.00",
      highPrice: "70.00",
      offerCount: "2",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

/** A real product screenshot in a quiet, paper-like frame. Width/height are
 *  each image's true captured size (not a shared guess) — Next/Image uses
 *  them to reserve the correct space before load, so nothing jumps into
 *  place once the image resolves. */
function Screen({
  src,
  alt,
  width,
  height,
  wide = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  wide?: boolean;
}) {
  return (
    <div
      className={`mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg ${
        wide ? "max-w-[560px]" : "max-w-[380px]"
      }`}
    >
      <Image src={src} alt={alt} width={width} height={height} className="h-auto w-full" />
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Name what matters",
    copy: "A practice is anything worth showing up for — writing, Qur'an study, reading, training, deep work. You define it; Daily Proof doesn't tell you what counts.",
    src: "/screens/studio.png",
    alt: "Choosing today's focus in Daily Proof Studio",
    width: 1280,
    height: 558,
    wide: true,
  },
  {
    n: "2",
    title: "Focus, without deciding twice",
    copy: "Start an open-ended Stopwatch, or set a Timer — 25, 45, 90 minutes, or your own. Reaching zero doesn't end anything automatically; you decide when the session is done.",
    src: "/screens/focus.png",
    alt: "A Timer session counting down in Daily Proof Focus mode",
    width: 900,
    height: 700,
  },
  {
    n: "3",
    title: "Say what actually happened",
    copy: "A few honest lines while it's still fresh. Not a report for anyone — a private note to yourself about what the session was really like.",
    src: "/screens/reflect.png",
    alt: "Reflecting on a finished session in Daily Proof",
    width: 900,
    height: 700,
  },
  {
    n: "4",
    title: "Keep the record",
    copy: "Every finished session becomes a page. No streaks, no percentages, no comparison to other days — just an honest, browsable account of your work.",
    src: "/screens/book.png",
    alt: "A day of saved proof in the Daily Proof Book",
    width: 1280,
    height: 570,
    wide: true,
  },
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
            A private place to focus, reflect, and keep an honest record of what you actually did.
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
            <a href="/studio" className="btn-primary w-full px-8 py-4 text-[16px] sm:w-auto">
              Open Daily Proof
            </a>
            <a href="#how" className="btn-quiet w-full px-8 py-4 text-[16px] sm:w-auto">
              See how it works
            </a>
          </div>
        </div>
        <p className="pb-8 text-center text-[13px] text-ink-faint" aria-hidden>
          Scroll to see how it works ↓
        </p>
      </section>

      {/* ---------- 2 · Why it exists ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Why it exists</h2>
            <div className="mx-auto mt-6 max-w-[58ch] space-y-4 text-center text-[16.5px] leading-relaxed text-ink-soft">
              <p>
                Most tools built for focus and habits are optimized to keep you coming back to
                them — a streak to protect, a dashboard to check, a notification to open. That is
                a different goal than doing the work.
              </p>
              <p>
                Daily Proof was built to answer one question honestly: did the work happen? Not
                how many days in a row. Not how today compares to yesterday. Just — did you show
                up, and for how long.
              </p>
              <p className="font-medium text-ink">
                It keeps that record quietly, on your own device, and asks nothing else of you.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 3 · How it works ---------- */}
      <section id="how" className="border-t border-line bg-surface2/40 scroll-mt-16">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">How it works</h2>
          </Reveal>
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
                  <Screen src={s.src} alt={s.alt} width={s.width} height={s.height} wide={s.wide} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4 · Proof, not performance ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Proof, not performance</h2>
            <div className="mx-auto mt-6 max-w-[58ch] space-y-4 text-center text-[16.5px] leading-relaxed text-ink-soft">
              <p>
                There is no streak to protect here, and no chain to break. A day with nothing
                logged is not failure data — it is just a day with nothing logged.
              </p>
              <p className="font-medium text-ink">
                What Daily Proof keeps is evidence of what happened, not a performance of what you
                intended. You don&rsquo;t perform for it. It just keeps the record.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 5 · A fact, not a promise ---------- */}
      <section className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">A fact, not a promise</h2>
            <div className="mx-auto mt-6 max-w-[58ch] space-y-4 text-center text-[16.5px] leading-relaxed text-ink-soft">
              <p>
                There is no account, because your reflections are not a data asset to attach one
                to. There is no server holding your proof, because a server is just a promise that
                someone else won&rsquo;t have a bad day, get acquired, or get breached.
              </p>
              <p>
                Every session and every note stays in this browser, on this device, until you
                choose to export it. Nothing syncs automatically. Nothing is analyzed, profiled,
                or sold. It even works offline, because everything it needs is already here.
              </p>
              <p className="font-medium text-ink">
                A promise can change. This can&rsquo;t — there&rsquo;s nothing here to sell,
                because your proof was never something we could see.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 6 · Your proof, made real ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <Reveal>
            <div className="grid items-center gap-12 sm:grid-cols-2 sm:gap-16">
              <div>
                <h2 className="font-display text-3xl font-semibold">Your proof, made real</h2>
                <p className="mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-soft">
                  Any finished session can become a card — the practice, the duration, a line
                  worth remembering, set on paper that shifts with when you did the work: morning
                  light, midday clarity, sunset amber, or quiet charcoal at night.
                </p>
                <p className="mt-4 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-soft">
                  It isn&rsquo;t a trophy. It&rsquo;s just what the work looked like, made real
                  enough to keep — or to send to the one person who&rsquo;d understand why it
                  mattered.
                </p>
              </div>
              <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl shadow-xl">
                <Image
                  src="/screens/share-card.png"
                  alt="A real Daily Proof share card, generated from an actual session"
                  width={1080}
                  height={1350}
                  className="h-auto w-full"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 7 · Pricing ---------- */}
      <section id="pricing" className="border-t border-line bg-surface2/40 scroll-mt-16">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Pricing</h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-center text-[15.5px] leading-relaxed text-ink-soft">
              One plan, two ways to pay for it. Every feature is included either way — Timer and
              Stopwatch, the Book, backups, sharing.
            </p>
            <div className="mt-10">
              <PlanPicker />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 8 · FAQ ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Questions, answered</h2>
            <div className="mt-10">
              <FaqList />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
