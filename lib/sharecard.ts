// Share card: an elegant, certificate-like image generated on demand after a
// session — never stored, never a page. Suits Instagram, Stories, X, Threads,
// LinkedIn, Facebook, and WhatsApp at 1080×1350 (4:5).

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

  // Warm cream field with a faint sunrise wash at the top.
  ctx.fillStyle = "#F7F2EA";
  ctx.fillRect(0, 0, W, H);
  const wash = ctx.createLinearGradient(0, 0, 0, 420);
  wash.addColorStop(0, "rgba(255, 138, 61, 0.10)");
  wash.addColorStop(1, "rgba(255, 138, 61, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, 420);

  // Hairline certificate frame.
  ctx.strokeStyle = "rgba(60, 50, 40, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 54, W - 108, H - 108);

  ctx.textAlign = "center";

  // Wordmark: "Daily" in sunrise gradient, "Proof" in charcoal, orange dot.
  ctx.font = `600 64px ${display}`;
  const dailyW = ctx.measureText("Daily ").width;
  const proofW = ctx.measureText("Proof").width;
  const dotW = ctx.measureText(".").width;
  const total = dailyW + proofW + dotW;
  const startX = W / 2 - total / 2;
  ctx.textAlign = "left";
  const grad = ctx.createLinearGradient(startX, 0, startX + dailyW, 0);
  grad.addColorStop(0, "#FF8A3D");
  grad.addColorStop(1, "#FF5E3A");
  ctx.fillStyle = grad;
  ctx.fillText("Daily ", startX, 190);
  ctx.fillStyle = "#2B2620";
  ctx.fillText("Proof", startX + dailyW, 190);
  ctx.fillStyle = "#FF7A2E";
  ctx.fillText(".", startX + dailyW + proofW + 4, 190);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(60, 50, 40, 0.55)";
  ctx.font = `500 30px ${body}`;
  ctx.fillText("PROOF OF PRACTICE", W / 2, 258);

  // Practice name.
  ctx.fillStyle = "#2B2620";
  ctx.font = `600 88px ${display}`;
  const nameLines = wrap(ctx, input.practiceName, W - 260).slice(0, 2);
  nameLines.forEach((line, i) => ctx.fillText(line, W / 2, 430 + i * 104));
  const afterName = 430 + (nameLines.length - 1) * 104;

  // Duration — the centerpiece.
  ctx.fillStyle = "#2B2620";
  ctx.font = `600 170px ${display}`;
  ctx.fillText(fmtDuration(input.durationMs), W / 2, afterName + 230);

  // Optional measurement.
  let y = afterName + 310;
  if (input.measurement !== undefined) {
    ctx.fillStyle = "rgba(60, 50, 40, 0.65)";
    ctx.font = `500 40px ${body}`;
    ctx.fillText(
      `${input.measurement}${input.measurementUnit ? ` ${input.measurementUnit}` : ""}`,
      W / 2,
      y
    );
    y += 70;
  }

  // Date.
  ctx.fillStyle = "rgba(60, 50, 40, 0.55)";
  ctx.font = `500 34px ${body}`;
  ctx.fillText(fmtDate(input.completedAt), W / 2, y + 8);

  // Divider dot.
  ctx.fillStyle = "#FF7A2E";
  ctx.beginPath();
  ctx.arc(W / 2, y + 76, 7, 0, Math.PI * 2);
  ctx.fill();

  // Quote.
  ctx.fillStyle = "#3A322A";
  ctx.font = `italic 500 44px ${display}`;
  const quoteLines = wrap(ctx, `\u201C${input.quote.text}\u201D`, W - 300).slice(0, 4);
  quoteLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 160 + i * 60));
  if (input.quote.author) {
    ctx.fillStyle = "rgba(60, 50, 40, 0.55)";
    ctx.font = `500 30px ${body}`;
    ctx.fillText(`— ${input.quote.author}`, W / 2, y + 160 + quoteLines.length * 60 + 24);
  }

  // Footer domain.
  ctx.fillStyle = "rgba(60, 50, 40, 0.45)";
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
