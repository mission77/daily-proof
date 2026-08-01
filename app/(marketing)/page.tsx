import Image from "next/image";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { FAQS } from "@/lib/faqs";
import { FaqList } from "@/components/site/FaqList";
import { PlanPicker } from "@/components/PlanPicker";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Daily Proof: Collect proof that meaningful work happened",
  description:
    "A private place to focus, reflect, and keep proof of the work you actually did. Local-first, no account, no cloud backup. Just an honest record.",
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
      "A private, local-first place to focus, reflect, and keep proof of meaningful work. No account, no cloud backup.",
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

/** A real product screenshot in a quiet, paper-like frame, sized to fill its
 *  grid column rather than capped to a decorative thumbnail width — these
 *  screenshots need to be read, not just glanced at. Width/height are each
 *  image's true captured size (not a shared guess), so Next/Image reserves
 *  the correct space before load and nothing jumps into place once the
 *  image resolves.
 *
 *  Phones get a real phone screenshot, not a shrunk desktop one — the two
 *  captures show different content at different aspect ratios (the mobile
 *  shots are actual 390×844 captures of the app), so this is two separate
 *  images swapped by CSS breakpoint (matching the Book page's mobile-date
 *  pattern) rather than one image resized via `sizes`. */
function Screen({
  src,
  mobileSrc,
  alt,
  width,
  height,
  mobileWidth,
  mobileHeight,
}: {
  src: string;
  mobileSrc: string;
  alt: string;
  width: number;
  height: number;
  mobileWidth: number;
  mobileHeight: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
      <Image
        src={mobileSrc}
        alt={alt}
        width={mobileWidth}
        height={mobileHeight}
        sizes="100vw"
        className="h-auto w-full sm:hidden"
      />
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="60vw"
        className="hidden h-auto w-full sm:block"
      />
    </div>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Name what matters",
    copy: "Anything worth showing up for: writing, Qur'an study, reading, training, deep work. You define it.",
    src: "/screens/studio.png",
    mobileSrc: "/screens/studio-mobile.png",
    alt: "Choosing today's focus in Daily Proof Studio",
    width: 2560,
    height: 1116,
    mobileWidth: 1170,
    mobileHeight: 2532,
  },
  {
    n: "2",
    title: "Focus, or log it after the fact",
    copy: "Run an open Stopwatch, set a Timer, or log a session you already finished elsewhere. However it happened, it counts.",
    src: "/screens/focus.png",
    mobileSrc: "/screens/focus-mobile.png",
    alt: "A Timer session counting down in Daily Proof Focus mode",
    width: 1800,
    height: 1400,
    mobileWidth: 1170,
    mobileHeight: 2532,
  },
  {
    n: "3",
    title: "Say what actually happened",
    copy: "A few honest lines while it's fresh. Not a report. A private note to yourself.",
    src: "/screens/reflect.png",
    mobileSrc: "/screens/reflect-mobile.png",
    alt: "Reflecting on a finished session in Daily Proof",
    width: 1800,
    height: 1400,
    mobileWidth: 1170,
    mobileHeight: 2532,
  },
  {
    n: "4",
    title: "Keep the record",
    copy: "Every session becomes a page. No streaks, no percentages, no comparisons. Just an honest, browsable record.",
    src: "/screens/book.png",
    mobileSrc: "/screens/book-mobile.png",
    alt: "A day of saved proof in the Daily Proof Book",
    width: 2560,
    height: 1140,
    mobileWidth: 1170,
    mobileHeight: 2532,
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
            <a href="#pricing" className="btn-primary w-full px-8 py-4 text-[16px] sm:w-auto">
              Get Daily Proof
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

      {/* ---------- 2 · How it works ---------- */}
      <section id="how" className="border-t border-line bg-surface2/40 scroll-mt-16">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">How it works</h2>
          </Reveal>
          <div className="mt-14 space-y-16 sm:space-y-24">
            {STEPS.map((s, i) => {
              // The screenshot is what actually explains the product, so it
              // always gets the wider column (3fr vs 2fr) — which physical
              // side that lands on alternates per step for visual rhythm,
              // controlled by flipping the track order, not by shrinking
              // the image back down to match the caption's width.
              const imageRight = i % 2 === 0;
              return (
                <Reveal key={s.n}>
                  <div
                    className={`grid items-center gap-8 sm:gap-12 ${
                      imageRight ? "sm:grid-cols-[2fr_3fr]" : "sm:grid-cols-[3fr_2fr]"
                    }`}
                  >
                    <div
                      className={`text-center sm:text-left ${imageRight ? "" : "sm:order-2"}`}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ember/10 font-display text-[15px] font-semibold text-ember-ink">
                        {s.n}
                      </span>
                      <h3 className="mt-4 font-display text-2xl font-semibold">{s.title}</h3>
                      <p className="mx-auto mt-2.5 max-w-[38ch] text-[15.5px] leading-relaxed text-ink-soft sm:mx-0">
                        {s.copy}
                      </p>
                    </div>
                    <Screen
                      src={s.src}
                      mobileSrc={s.mobileSrc}
                      alt={s.alt}
                      width={s.width}
                      height={s.height}
                      mobileWidth={s.mobileWidth}
                      mobileHeight={s.mobileHeight}
                    />
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- 3 · Proof, not performance ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Proof, not performance</h2>
            <div className="mx-auto mt-6 max-w-[58ch] space-y-4 text-center text-[16.5px] leading-relaxed text-ink-soft">
              <p>
                Most tools optimize for coming back: a streak, a dashboard, a notification. Daily
                Proof asks a simpler question. Did the work happen?
              </p>
              <p className="font-medium text-ink">
                Not how many days in a row. A quiet day isn&rsquo;t failure. It&rsquo;s just a
                quiet day. You don&rsquo;t perform for this app. It just keeps the record.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 4 · A fact, not a promise ---------- */}
      <section className="border-t border-line bg-surface2/40">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">A fact, not a promise</h2>
            <div className="mx-auto mt-6 max-w-[58ch] space-y-4 text-center text-[16.5px] leading-relaxed text-ink-soft">
              <p>
                There&rsquo;s no account, because your reflections aren&rsquo;t a data asset. There&rsquo;s
                no server holding your proof, because a server is just a promise someone could break.
              </p>
              <p className="font-medium text-ink">
                Everything stays on this device until you export it. Nothing syncs. Nothing is
                sold. It even works offline. A promise can change. This can&rsquo;t.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 5 · Your proof, made real ---------- */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 sm:py-28">
          <Reveal>
            <div className="grid items-center gap-12 sm:grid-cols-2 sm:gap-16">
              <div>
                <h2 className="font-display text-3xl font-semibold">Your proof, made real</h2>
                <p className="mt-5 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-soft">
                  Any session can become a card: practice, duration, a line worth remembering, on
                  paper that shifts with the time of day. Morning light, midday clarity, sunset
                  amber, charcoal at night.
                </p>
                <p className="mt-4 max-w-[42ch] text-[16.5px] leading-relaxed text-ink-soft">
                  Not a trophy. Just what the work looked like, worth keeping or sending to the one
                  person who&rsquo;d understand.
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

      {/* ---------- 6 · Pricing ---------- */}
      <section id="pricing" className="border-t border-line bg-surface2/40 scroll-mt-16">
        <div className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-semibold">Pricing</h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-center text-[15.5px] leading-relaxed text-ink-soft">
              Two ways to pay. Every feature included either way.
            </p>
            <div className="mt-10">
              <PlanPicker />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 7 · FAQ ---------- */}
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
