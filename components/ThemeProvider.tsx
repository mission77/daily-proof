"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ThemePreference } from "@/lib/types";
import { applyTheme, resolveTheme } from "@/lib/theme";
import { getThemePreference, setThemePreference } from "@/lib/repos/settings";

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "auto",
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>("auto");

  // Load the real preference from IndexedDB (boot script already painted a best guess).
  useEffect(() => {
    let cancelled = false;
    getThemePreference().then((pref) => {
      if (cancelled) return;
      setPref(pref);
      applyTheme(resolveTheme(pref));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto mode: re-evaluate every minute so 6am/6pm transitions happen live.
  useEffect(() => {
    if (preference !== "auto") return;
    const tick = () => applyTheme(resolveTheme("auto"));
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [preference]);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPref(pref);
    applyTheme(resolveTheme(pref));
    await setThemePreference(pref);
  }, []);

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
