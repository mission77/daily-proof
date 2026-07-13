// Quote engine for share cards.
// Quotes are matched to the practice's inferred category, and recently used
// quotes are tracked so the same one doesn't reappear until the pool cycles.
// All lines are original to Daily Proof or public-domain classics.

import { getSetting, setSetting } from "@/lib/repos/settings";

export type QuoteCategory =
  | "faith"
  | "fitness"
  | "reading"
  | "business"
  | "writing"
  | "coding"
  | "health"
  | "learning"
  | "creative"
  | "general";

export interface Quote {
  id: string;
  text: string;
  author?: string; // omitted for original Daily Proof lines
}

const KEYWORDS: Record<Exclude<QuoteCategory, "general">, string[]> = {
  faith: ["quran", "qur'an", "prayer", "salah", "dhikr", "bible", "torah", "meditat", "faith", "worship", "scripture", "hifz", "memoriz"],
  fitness: ["run", "gym", "lift", "workout", "train", "bike", "cycling", "swim", "yoga", "stretch", "walk", "row", "climb"],
  reading: ["read", "book", "chapter", "study text", "literature"],
  business: ["business", "startup", "launch", "market", "sales", "outreach", "pitch", "invoice", "client", "product"],
  writing: ["writ", "draft", "essay", "journal", "blog", "script", "novel", "poem", "newsletter"],
  coding: ["code", "coding", "program", "debug", "ship", "deploy", "build app", "dev", "refactor", "software"],
  health: ["sleep", "cook", "meal", "nutrition", "fast", "therapy", "recover", "rest", "breath"],
  learning: ["learn", "course", "language", "practice test", "flashcard", "lecture", "math", "physics", "anki", "revision"],
  creative: ["draw", "paint", "design", "music", "violin", "piano", "guitar", "sing", "video", "edit", "photo", "film", "sketch", "compose"],
};

export function inferCategory(name: string, description?: string): QuoteCategory {
  const hay = `${name} ${description ?? ""}`.toLowerCase();
  for (const [cat, words] of Object.entries(KEYWORDS) as [Exclude<QuoteCategory, "general">, string[]][]) {
    if (words.some((w) => hay.includes(w))) return cat;
  }
  return "general";
}

// q(id, text, author?) — terse helper keeps the pool readable.
const q = (id: string, text: string, author?: string): Quote => ({ id, text, author });

export const QUOTES: Record<QuoteCategory, Quote[]> = {
  faith: [
    q("fa1", "Verily, with hardship comes ease.", "Qur'an 94:6"),
    q("fa2", "The most beloved deeds are the most consistent, even if small.", "Prophetic tradition"),
    q("fa3", "Showing up before dawn is its own kind of prayer."),
    q("fa4", "Devotion is measured in returns, not arrivals."),
    q("fa5", "A little, done daily, outweighs a lot done once."),
    q("fa6", "The heart grows quiet where the practice is steady."),
    q("fa7", "Faith is kept the way a fire is kept — tended."),
    q("fa8", "What you recite daily begins to recite you."),
    q("fa9", "Stillness is not empty. It is full of what matters."),
    q("fa10", "Every session is a renewal of intention."),
    q("fa11", "Patience is beautiful.", "Qur'an 12:18"),
    q("fa12", "The proof of devotion is the return to it."),
  ],
  fitness: [
    q("fi1", "The body keeps an honest ledger."),
    q("fi2", "You don't find time to train. You take it."),
    q("fi3", "Strength is rent. It is due every day."),
    q("fi4", "Today's session is tomorrow's baseline."),
    q("fi5", "No session is wasted except the one skipped."),
    q("fi6", "Sweat is proof the argument with yourself was won."),
    q("fi7", "We are what we repeatedly do.", "Will Durant, after Aristotle"),
    q("fi8", "The last rep argues. Showing up already answered."),
    q("fi9", "Discipline outlasts motivation by decades."),
    q("fi10", "Move first. The mood follows."),
    q("fi11", "A year from now you will wish you had started today."),
    q("fi12", "Endurance is built one unremarkable session at a time."),
  ],
  reading: [
    q("re1", "A reader lives a thousand lives.", "attributed proverb"),
    q("re2", "Pages read in silence speak for years."),
    q("re3", "A book is a conversation you can keep returning to."),
    q("re4", "Reading is earning interest on other people's decades."),
    q("re5", "Twenty pages a day is thirty books a year."),
    q("re6", "The mind, once stretched by a new idea, never regains its original shape."),
    q("re7", "Slow reading is not falling behind. It is going deep."),
    q("re8", "Every chapter finished is a small kept promise."),
    q("re9", "Employ your time in improving yourself by other men's writings.", "Socrates, as recorded"),
    q("re10", "What you read in quiet returns in conversation."),
    q("re11", "Books are proof that patience compounds."),
    q("re12", "One page is never just one page."),
  ],
  business: [
    q("bu1", "Ship small. Ship often. Ship true."),
    q("bu2", "The market rewards the ones still here next year."),
    q("bu3", "Momentum is a series of unglamorous mornings."),
    q("bu4", "Do one thing perfectly. Feature creep is fear."),
    q("bu5", "Customers can feel craftsmanship through a screen."),
    q("bu6", "Diligence is the mother of good luck.", "Benjamin Franklin"),
    q("bu7", "The plan is worthless. The planning session is everything."),
    q("bu8", "Every business is built between distractions."),
    q("bu9", "Quiet execution beats loud intention."),
    q("bu10", "You are one focused hour from clarity."),
    q("bu11", "Well done is better than well said.", "Benjamin Franklin"),
    q("bu12", "The proof of the strategy is the session log."),
  ],
  writing: [
    q("wr1", "Words on the page outrank ideas in the head."),
    q("wr2", "First drafts exist to be written, not admired."),
    q("wr3", "The muse visits writers who are already seated."),
    q("wr4", "Write the sentence. The paragraph will follow."),
    q("wr5", "Clarity on the page begins as struggle in the chair."),
    q("wr6", "Either write something worth reading or do something worth writing.", "Benjamin Franklin"),
    q("wr7", "A page a day is a book a year."),
    q("wr8", "Editing is the reward for having dared a draft."),
    q("wr9", "The blank page loses every time you sit down."),
    q("wr10", "Style is what survives revision."),
    q("wr11", "Every writer you admire kept an unremarkable schedule."),
    q("wr12", "Ink is cheaper than regret."),
  ],
  coding: [
    q("co1", "Working code is the only status update that matters."),
    q("co2", "Commit early, commit honest."),
    q("co3", "The bug yields to the one who stays."),
    q("co4", "Elegance is what remains after the deadline."),
    q("co5", "Every green test is a small kept promise."),
    q("co6", "Read the error message. Then read it again."),
    q("co7", "Ship it, then sharpen it."),
    q("co8", "Deep work compiles."),
    q("co9", "A focused hour beats a scattered day."),
    q("co10", "The codebase remembers who showed up."),
    q("co11", "Refactoring is respect paid to your future self."),
    q("co12", "Simplicity is the hardest feature to build."),
  ],
  health: [
    q("he1", "Rest is not the absence of progress."),
    q("he2", "The quiet habits carry the loud years."),
    q("he3", "You cannot pour from an unkept vessel."),
    q("he4", "Health is the first wealth.", "after Emerson"),
    q("he5", "A calm body is a decision made daily."),
    q("he6", "Cooking your own meal is a vote for your own life."),
    q("he7", "Sleep is the foundation every other practice stands on."),
    q("he8", "Recovery is training too."),
    q("he9", "Small consistent care outperforms dramatic correction."),
    q("he10", "Breath by breath is still forward."),
    q("he11", "Tend to the basics and the basics tend to you."),
    q("he12", "The best project you will ever maintain is you."),
  ],
  learning: [
    q("le1", "Every expert was once a beginner who kept the schedule."),
    q("le2", "An investment in knowledge pays the best interest.", "Benjamin Franklin"),
    q("le3", "Confusion is the feeling of a mind under construction."),
    q("le4", "Review beats cramming. Returning beats arriving."),
    q("le5", "What you struggle to recall, you own."),
    q("le6", "Twenty focused minutes outweigh two distracted hours."),
    q("le7", "Learning is the slowest magic and the most real."),
    q("le8", "Tell me and I forget. Teach me and I remember. Involve me and I learn.", "attributed to Franklin"),
    q("le9", "The curve bends for those who return tomorrow."),
    q("le10", "Fluency is a thousand quiet sessions wearing a groove."),
    q("le11", "Notes taken today are questions answered next month."),
    q("le12", "You are always one session less ignorant than yesterday."),
  ],
  creative: [
    q("cr1", "Inspiration exists, but it has to find you working.", "attributed to Picasso"),
    q("cr2", "Taste is built the same way skill is — by returning."),
    q("cr3", "Make the bad version. It guards the door to the good one."),
    q("cr4", "The instrument remembers your hands."),
    q("cr5", "Craft is love made repeatable."),
    q("cr6", "Every finished piece began as an unpromising session."),
    q("cr7", "Practice until the difficult becomes quiet."),
    q("cr8", "Art is the proof that attention was paid."),
    q("cr9", "Your style is the sum of your sessions."),
    q("cr10", "The blank canvas fears the scheduled artist."),
    q("cr11", "Play the passage slowly enough to love it."),
    q("cr12", "Creation favors the one who arrives."),
  ],
  general: [
    q("ge1", "Proof over promises."),
    q("ge2", "The work does not need to be witnessed. It needs to be done."),
    q("ge3", "Show up. That is the whole secret, kept in plain sight."),
    q("ge4", "Little strokes fell great oaks.", "Benjamin Franklin"),
    q("ge5", "Consistency is the quietest form of ambition."),
    q("ge6", "Today's session is a letter to who you are becoming."),
    q("ge7", "You never regret the hour you gave to what matters."),
    q("ge8", "The days are long but the record is honest."),
    q("ge9", "One focus. One timer. One true paragraph."),
    q("ge10", "It is not the mountain we conquer but ourselves.", "Edmund Hillary — public remark"),
    q("ge11", "Attention is the rarest generosity you give your own life."),
    q("ge12", "Meaning is made in sessions, not in summaries."),
  ],
};

const RECENT_KEY = "recentQuoteIds";
const RECENT_CAP = 60;

/** Picks a quote for the practice's category, avoiding recently used ones
 *  until the category pool has cycled. */
export async function pickQuote(practiceName: string, description?: string): Promise<Quote> {
  const category = inferCategory(practiceName, description);
  const pool = QUOTES[category].length > 0 ? QUOTES[category] : QUOTES.general;
  const recent = (await getSetting<string[]>(RECENT_KEY)) ?? [];
  const fresh = pool.filter((qq) => !recent.includes(qq.id));
  const candidates = fresh.length > 0 ? fresh : pool; // pool exhausted: cycle
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  const nextRecent = [chosen.id, ...recent.filter((id) => id !== chosen.id)].slice(0, RECENT_CAP);
  await setSetting(RECENT_KEY, nextRecent);
  return chosen;
}
