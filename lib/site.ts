// Site-wide constants. The canonical origin comes from the environment so
// previews and production resolve correctly; dailyproofhq.com is the default.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dailyproofhq.com").replace(/\/$/, "");
export const SITE_NAME = "Daily Proof";
export const SITE_TAGLINE = "Collect proof that meaningful work happened.";
export const SITE_DESCRIPTION =
  "Daily Proof helps you focus, finish meaningful work, and keep a private record of the work you actually did. Local-first, offline, and calm by design.";
export const SUPPORT_EMAIL = "dailyproofhq@gmail.com";
