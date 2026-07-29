// Content-Security-Policy: the app has no external scripts (Stripe/billing
// portal are redirects to stripe.com, never embedded — see lib/stripe/*),
// no analytics, no third-party trackers. 'unsafe-inline' is required for
// script-src (the flash-free theme boot script in app/layout.tsx, and the
// JSON-LD blocks on the landing page — CSP governs every <script> tag
// regardless of type) and style-src (Tailwind + a couple of inline style
// attributes); both are static, developer-authored content, never built
// from user input, so this is a deliberate, low-risk trade-off rather than
// standing up a nonce pipeline for a handful of static strings.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
