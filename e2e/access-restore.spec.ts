import { test, expect } from "@playwright/test";

// This dev/test environment has no Stripe keys configured (see .env.local),
// so /api/access/restore and /api/access/restore/confirm both fail the
// config check before ever reaching Stripe — exactly the "must never crash
// without keys, must fail generically" behavior that matters most to verify
// without live Stripe. The eligibility branches (active premium, paid
// lifetime, canceled/refunded rejection) need a staging environment with
// real Stripe + Loops test-mode keys to exercise end-to-end; that gap is
// called out in the final report rather than faked here.

test("restore request fails closed (not_configured) without Stripe/Loops keys, never crashes", async ({
  request,
}) => {
  const res = await request.post("/api/access/restore", {
    data: { email: "someone@example.com" },
  });
  expect(res.status()).toBe(503);
  const body = await res.json();
  expect(body).toEqual({ ok: false, reason: "not_configured" });
});

test("restore confirm fails closed (not_configured) without Stripe keys, never crashes", async ({ request }) => {
  const res = await request.post("/api/access/restore/confirm", {
    data: { token: "not-a-real-token" },
  });
  expect(res.status()).toBe(503);
  const body = await res.json();
  expect(body).toEqual({ ok: false, reason: "not_configured" });
});

test("restore request is rate-limited per client", async ({ request }) => {
  let last;
  for (let i = 0; i < 6; i++) {
    last = await request.post("/api/access/restore", { data: { email: "someone@example.com" } });
  }
  // The 6th call within the window (limit is 5/min) must be rejected — and
  // rate limiting is enforced before the config check, so this holds
  // regardless of whether Stripe/Loops are configured.
  expect(last!.status()).toBe(429);
  const body = await last!.json();
  expect(body).toEqual({ ok: false, reason: "rate_limited" });
});

test("restore request rejects a malformed body without crashing", async ({ request }) => {
  const res = await request.post("/api/access/restore", {
    headers: { "Content-Type": "application/json" },
    data: "not json",
  });
  expect([400, 429, 503]).toContain(res.status());
});
