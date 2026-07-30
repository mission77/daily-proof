// Site-wide constants. The canonical origin comes from the environment so
// previews and production resolve correctly; dailyproofhq.com is the default.
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://dailyproofhq.com").replace(/\/$/, "");
export const SITE_NAME = "Daily Proof";
export const SITE_TAGLINE = "Collect proof that meaningful work happened.";
export const SITE_DESCRIPTION =
  "Daily Proof helps you focus, finish meaningful work, and keep a private record of the work you actually did. Local-first, offline, and calm by design.";
export const SUPPORT_EMAIL = "dailyproofhq@gmail.com";

// Daily Proof has launched. The default (no env var set) is the live public
// site: full pricing, Stripe checkout, "Open the app" everywhere. This is
// deliberately opt-in rather than opt-out: a missing or unset env var must
// never silently revert a shipped product back to invite-only. Set
// NEXT_PUBLIC_BETA_MODE=1 only to temporarily fall back to the dormant
// invite-only beta flow (e.g. pausing public signups in an emergency).
export const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "1";
