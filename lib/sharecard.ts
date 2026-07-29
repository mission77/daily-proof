// Share card: an elegant, certificate-like image generated on demand after a
// session — never stored, never a page. Suits Instagram, Stories, X, Threads,
// LinkedIn, Facebook, and WhatsApp at 1080×1350 (4:5).
//
// The background is not decoration — it's identity. Every card is printed on
// the same premium archival paper (warm ivory, near-invisible grain and
// fiber, a soft hairline frame), and that paper quietly tells you when the
// proof was earned: sunrise amber in the morning, clean neutral light at
// midday, a golden edge at sunset, warm charcoal — never black — at night.
// Typography and the duration stay the hero throughout; the paper only ever
// sets the room they're standing in.

import type { Quote } from "@/lib/quotes";

export interface ShareCardInput {
  practiceName: string;
  durationMs: number;
  measurement?: number;
  measurementUnit?: string;
  completedAt: string; // ISO
  quote: Quote;
}

const W = 1080;
const H = 1350;

// ---------- Time of day ----------
// Local completion time, not a fixed clock or geolocation — the same quiet
// signal the rest of the app uses for Day/Night (see lib/theme.ts).

type TimeOfDay = "morning" | "afternoon" | "sunset" | "night";

function timeOfDay(iso: string): TimeOfDay {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 20) return "sunset";
  return "night";
}

// ---------- Palette ----------
// One paper, one system, four moods. Ink and frame flip to light-on-dark
// only for night; the accent (the one place color is allowed to speak)
// shifts warmth per period but is always recognizably Daily Proof orange.

interface GlowLayer {
  /** Fraction of card height the gradient spans, from the top. */
  reach: number;
  from: string;
  to: string;
}

interface Palette {
  paper: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  inkFooter: string;
  frame: string;
  accentA: string; // "Daily" gradient start
  accentB: string; // "Daily" gradient end
  accentDot: string; // wordmark dot + divider dot
  glows: GlowLayer[];
  vignette: string; // edge color at full vignette strength
  dark: boolean;
}

const LIGHT_INK = {
  ink: "#2B2620",
  inkSoft: "rgba(60, 50, 40, 0.66)",
  inkFaint: "rgba(60, 50, 40, 0.55)",
  inkFooter: "rgba(60, 50, 40, 0.42)",
  frame: "rgba(60, 50, 40, 0.16)",
};

const PALETTES: Record<TimeOfDay, Palette> = {
  morning: {
    paper: "#FBF4E6",
    ...LIGHT_INK,
    accentA: "#FFB369",
    accentB: "#FF8A3D",
    accentDot: "#FF9A4D",
    glows: [{ reach: 0.46, from: "rgba(255, 196, 120, 0.20)", to: "rgba(255, 196, 120, 0)" }],
    vignette: "rgba(50, 40, 25, 0.05)",
    dark: false,
  },
  afternoon: {
    paper: "#F7F2EA",
    ...LIGHT_INK,
    accentA: "#FF8A3D",
    accentB: "#FF5E3A",
    accentDot: "#FF7A2E",
    glows: [{ reach: 0.3, from: "rgba(255, 250, 240, 0.08)", to: "rgba(255, 250, 240, 0)" }],
    vignette: "rgba(50, 40, 25, 0.045)",
    dark: false,
  },
  sunset: {
    paper: "#F4EAD8",
    ...LIGHT_INK,
    accentA: "#FF7A33",
    accentB: "#E2531F",
    accentDot: "#E85D2A",
    glows: [
      { reach: 0.22, from: "rgba(255, 140, 70, 0.24)", to: "rgba(255, 140, 70, 0)" },
      { reach: 0.65, from: "rgba(255, 190, 130, 0.06)", to: "rgba(255, 190, 130, 0)" },
    ],
    vignette: "rgba(60, 40, 20, 0.06)",
    dark: false,
  },
  night: {
    paper: "#241F1A",
    ink: "#EFE3D2",
    inkSoft: "rgba(239, 227, 210, 0.72)",
    inkFaint: "rgba(239, 227, 210, 0.56)",
    inkFooter: "rgba(239, 227, 210, 0.38)",
    frame: "rgba(239, 227, 210, 0.14)",
    accentA: "#FFA35C",
    accentB: "#FF7A3D",
    accentDot: "#FF9247",
    // Cool moonlight, kept faint — the paper stays warm charcoal, never blue.
    glows: [{ reach: 0.38, from: "rgba(210, 222, 255, 0.05)", to: "rgba(210, 222, 255, 0)" }],
    vignette: "rgba(0, 0, 0, 0.18)",
    dark: true,
  },
};

// ---------- Paper texture ----------
// Archival paper, not a digital gradient: near-invisible grain, sparse
// fiber, a soft vignette for depth. Rendered once per card, at half
// resolution and upscaled (the natural softening reads as paper, not noise).

function paintGrain(ctx: CanvasRenderingContext2D, palette: Palette) {
  const gw = Math.round(W / 2);
  const gh = Math.round(H / 2);
  const off = document.createElement("canvas");
  off.width = gw;
  off.height = gh;
  const octx = off.getContext("2d");
  if (!octx) return;

  const img = octx.createImageData(gw, gh);
  const data = img.data;
  // Neutral mid-gray noise blended with "overlay" reads as texture on any
  // base tone — it lightens dark paper and darkens light paper symmetrically,
  // so the same grain works for both day and night without two code paths.
  for (let i = 0; i < data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 26;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);

  ctx.save();
  ctx.globalAlpha = palette.dark ? 0.16 : 0.1;
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(off, 0, 0, gw, gh, 0, 0, W, H);
  ctx.restore();
}

function paintFibers(ctx: CanvasRenderingContext2D, palette: Palette) {
  const count = 260;
  const highlight = palette.dark ? "255, 247, 232" : "255, 255, 255";
  const shadow = palette.dark ? "0, 0, 0" : "90, 72, 48";

  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const light = Math.random() > 0.5;
    ctx.strokeStyle = `rgba(${light ? highlight : shadow}, ${(0.025 + Math.random() * 0.03).toFixed(3)})`;
    ctx.lineWidth = 0.4 + Math.random() * 0.4;
    const x = Math.random() * W;
    const y = Math.random() * H;
    const len = 3 + Math.random() * 10;
    const angle = Math.random() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function paintVignette(ctx: CanvasRenderingContext2D, palette: Palette) {
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.hypot(cx, cy);
  const vg = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  vg.addColorStop(0, "rgba(0, 0, 0, 0)");
  vg.addColorStop(1, palette.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function paintGlow(ctx: CanvasRenderingContext2D, layer: GlowLayer) {
  const grad = ctx.createLinearGradient(0, 0, 0, H * layer.reach);
  grad.addColorStop(0, layer.from);
  grad.addColorStop(1, layer.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H * layer.reach);
}

/** A soft, low, printed-impression shadow — used only on the wordmark and
 *  the duration, the two moments that should feel pressed into the page
 *  rather than laid flat on top of it. Always reset afterward. */
function withLetterpress(ctx: CanvasRenderingContext2D, palette: Palette, draw: () => void) {
  ctx.save();
  ctx.shadowColor = palette.dark ? "rgba(0, 0, 0, 0.4)" : "rgba(40, 30, 20, 0.16)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  draw();
  ctx.restore();
}

function fmtDuration(ms: number): string {
  const totalMin = Math.max(1, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m} min`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the card and returns a PNG blob. Fonts already loaded by the app
 *  (Fraunces + Inter variables) are reused via document.fonts. */
export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const display = '"Fraunces Variable", Georgia, serif';
  const body = '"Inter Variable", system-ui, sans-serif';
  const palette = PALETTES[timeOfDay(input.completedAt)];

  // ---------- Paper ----------
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, W, H);
  paintGrain(ctx, palette);
  paintFibers(ctx, palette);
  for (const layer of palette.glows) paintGlow(ctx, layer);
  paintVignette(ctx, palette);

  // Hairline certificate frame.
  ctx.strokeStyle = palette.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 54, W - 108, H - 108);

  ctx.textAlign = "center";

  // Wordmark: "Daily" in a period-tinted sunrise gradient, "Proof" in ink,
  // orange dot — the one mark that stays instantly recognizable everywhere.
  ctx.font = `600 64px ${display}`;
  const dailyW = ctx.measureText("Daily ").width;
  const proofW = ctx.measureText("Proof").width;
  const dotW = ctx.measureText(".").width;
  const total = dailyW + proofW + dotW;
  const startX = W / 2 - total / 2;
  ctx.textAlign = "left";
  withLetterpress(ctx, palette, () => {
    const grad = ctx.createLinearGradient(startX, 0, startX + dailyW, 0);
    grad.addColorStop(0, palette.accentA);
    grad.addColorStop(1, palette.accentB);
    ctx.fillStyle = grad;
    ctx.fillText("Daily ", startX, 190);
    ctx.fillStyle = palette.ink;
    ctx.fillText("Proof", startX + dailyW, 190);
    ctx.fillStyle = palette.accentDot;
    ctx.fillText(".", startX + dailyW + proofW + 4, 190);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `500 30px ${body}`;
  ctx.fillText("PROOF OF PRACTICE", W / 2, 258);

  // Practice name.
  ctx.fillStyle = palette.ink;
  ctx.font = `600 88px ${display}`;
  const nameLines = wrap(ctx, input.practiceName, W - 260).slice(0, 2);
  nameLines.forEach((line, i) => ctx.fillText(line, W / 2, 430 + i * 104));
  const afterName = 430 + (nameLines.length - 1) * 104;

  // Duration — the centerpiece.
  ctx.font = `600 170px ${display}`;
  withLetterpress(ctx, palette, () => {
    ctx.fillStyle = palette.ink;
    ctx.fillText(fmtDuration(input.durationMs), W / 2, afterName + 230);
  });

  // Optional measurement.
  let y = afterName + 310;
  if (input.measurement !== undefined) {
    ctx.fillStyle = palette.inkSoft;
    ctx.font = `500 40px ${body}`;
    ctx.fillText(
      `${input.measurement}${input.measurementUnit ? ` ${input.measurementUnit}` : ""}`,
      W / 2,
      y
    );
    y += 70;
  }

  // Date.
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `500 34px ${body}`;
  ctx.fillText(fmtDate(input.completedAt), W / 2, y + 8);

  // Divider dot.
  ctx.fillStyle = palette.accentDot;
  ctx.beginPath();
  ctx.arc(W / 2, y + 76, 7, 0, Math.PI * 2);
  ctx.fill();

  // Quote.
  ctx.fillStyle = palette.ink;
  ctx.font = `italic 500 44px ${display}`;
  const quoteLines = wrap(ctx, `“${input.quote.text}”`, W - 300).slice(0, 4);
  quoteLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 160 + i * 60));
  if (input.quote.author) {
    ctx.fillStyle = palette.inkFaint;
    ctx.font = `500 30px ${body}`;
    ctx.fillText(`— ${input.quote.author}`, W / 2, y + 160 + quoteLines.length * 60 + 24);
  }

  // Footer domain.
  ctx.fillStyle = palette.inkFooter;
  ctx.font = `500 30px ${body}`;
  ctx.fillText("dailyproofhq.com", W / 2, H - 110);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Card render failed"))), "image/png");
  });
}

/** Opens the native share sheet with the card; falls back to downloading the
 *  image where Web Share with files is unavailable (most desktops). */
export async function shareCard(blob: Blob, practiceName: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], "daily-proof.png", { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Daily Proof", text: `Proof: ${practiceName}` });
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "daily-proof.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
