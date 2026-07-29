// Daily Proof's completion sound: one restrained, original, synthesized
// tone — an alert, not music. Web Audio API only; nothing is loaded from a
// file, nothing external or stock. A static interval (two simultaneous sine
// tones a fifth apart, softened through a low-pass filter) with a single
// soft-attack, smooth-decay envelope — one calm swell, not a ring, not a
// click, not a melody (nothing here changes pitch over time; a melody is a
// sequence of notes, this is one sustained timbre). Same tone every time,
// by design: repetition across a year of sessions is what makes it feel
// like Daily Proof's, not a generic system beep.
//
// Sound is always optional. Every completion state has a visual and
// screen-reader equivalent (see app/focus/page.tsx) — nothing here is ever
// load-bearing for understanding what happened.

type AudioContextCtor = typeof AudioContext;

function getContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  const Ctor = getContextCtor();
  if (!Ctor) return null;
  if (!sharedContext) {
    try {
      sharedContext = new Ctor();
    } catch {
      return null;
    }
  }
  return sharedContext;
}

export function audioAvailable(): boolean {
  return getContextCtor() !== null;
}

/** Unlocks the shared AudioContext as part of a genuine user gesture (call
 *  this from the Start Session click handler). Browsers require this once
 *  per page before any later, un-gestured playback — like the completion
 *  tone firing on its own once a Timer reaches zero — is allowed to play.
 *  Never plays anything audible itself. */
export function primeAudioContext(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      /* still locked; the completion tone will simply no-op later */
    });
  }
}

/** Plays the one-shot completion tone. Resolves whether or not it actually
 *  played — autoplay restrictions, a missing AudioContext, or any runtime
 *  error all fail silently, since sound is never required to know a Timer
 *  finished (the visual/ARIA state carries that on its own). */
export async function playCompletionSound(volume = 0.18): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;

    const now = ctx.currentTime;
    const duration = 1.0;
    const clampedVolume = Math.max(0, Math.min(0.4, volume));

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    filter.Q.value = 0.7;
    filter.connect(master);

    // A4 and its perfect fifth, held together and static throughout —
    // warmth from the interval, not from movement.
    const fundamental = 440;
    for (const [freq, level] of [
      [fundamental, 1],
      [fundamental * 1.5, 0.35],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = level;
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }

    // Soft attack (no click), a brief hold, then a smooth exponential
    // release — one swell, not a repeated ring.
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(clampedVolume, now + 0.06);
    master.gain.setValueAtTime(clampedVolume, now + 0.22);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  } catch {
    /* audio blocked or unavailable mid-flight — never surfaces to the caller */
  }
}

/** A single short vibration pulse, not a pattern — mirrors the calm,
 *  one-shot character of the sound. No-ops where unsupported. */
export function vibrateCompletion(): void {
  try {
    navigator.vibrate?.(60);
  } catch {
    /* unsupported or blocked */
  }
}
