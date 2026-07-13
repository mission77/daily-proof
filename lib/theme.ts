import { ThemePreference } from "@/lib/types";

export type ResolvedTheme = "day" | "night";

/** Auto: day from 6am to 6pm local time, night otherwise. */
export function resolveTheme(pref: ThemePreference, now: Date = new Date()): ResolvedTheme {
  if (pref === "day" || pref === "night") return pref;
  const h = now.getHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "day" ? "#f7f1e8" : "#191613");
}

/** Inline script for flash-free first paint. Reads the localStorage mirror only;
 *  IndexedDB (async) remains the source of truth and corrects it after hydrate. */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("dp-theme-mirror")||"auto";var h=new Date().getHours();var t=p==="day"||p==="night"?p:(h>=6&&h<18?"day":"night");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="day";}})();`;
