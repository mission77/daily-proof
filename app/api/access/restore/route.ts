import { NextRequest, NextResponse } from "next/server";
import { getStripe, readStripeEnv } from "@/lib/stripe/server";
import { findEligibleCustomerByEmail } from "@/lib/stripe/restoreEligibility";
import { signRestoreToken } from "@/lib/license/restoreToken";
import { currentSigningSecret } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fail(reason: string, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

async function sendRestoreEmail(email: string, link: string): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const transactionalId = process.env.LOOPS_RESTORE_TRANSACTIONAL_ID;
  if (!apiKey || !transactionalId) return; // checked again by the caller before this is ever reached
  try {
    const res = await fetch("https://app.loops.so/api/v1/transactional", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transactionalId, email, dataVariables: { restoreLink: link } }),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("restore access: Loops send failed", res.status, body.slice(0, 200));
    }
  } catch (err) {
    console.error("restore access: Loops request failed", err);
  }
}

/** POST /api/access/restore { email }
 *
 *  Starts the email-verified restore-access flow for someone who lost local
 *  access (cleared storage, new device, reinstall) but still has a valid
 *  purchase. If `email` matches a Stripe customer with an active/trialing
 *  subscription or a paid lifetime purchase, a short-lived signed restore
 *  link is emailed via Loops; the browser never receives the Stripe
 *  customer id or any purchase details directly.
 *
 *  The response is identical (`{ ok: true }`) whether or not a match was
 *  found, so this endpoint can't be used to learn which emails have
 *  purchased Daily Proof. Only the response *content* is protected against
 *  enumeration this way — a network-timing side channel between "found" and
 *  "not found" (an extra Stripe lookup plus an email send) still exists in
 *  principle; per-IP and per-email rate limiting below is the mitigation
 *  for that, not perfect constant-time execution.
 *
 *  Local proof data is never touched or transmitted by this flow. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`restore:${clientKey(req)}`, 5, 60_000)) {
    return fail("rate_limited", 429);
  }

  const env = readStripeEnv();
  const signingSecret = currentSigningSecret();
  const loopsConfigured = Boolean(process.env.LOOPS_API_KEY && process.env.LOOPS_RESTORE_TRANSACTIONAL_ID);
  if (!env || !signingSecret || !loopsConfigured) {
    // A config-level failure, not a per-email one — safe to report plainly;
    // it's identical for every request regardless of the email given.
    return fail("not_configured", 503);
  }

  let email: unknown;
  try {
    email = (await req.json())?.email;
  } catch {
    return fail("invalid_body", 400);
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return fail("invalid_email", 400);
  }
  const normalized = email.trim().toLowerCase();

  if (!rateLimit(`restore-email:${normalized}`, 3, 15 * 60_000)) {
    // Still a generic-shaped failure — this only throttles how often *this*
    // address can be re-emailed, so it can't be spammed by someone who
    // doesn't own it, but it doesn't confirm the address exists either.
    return NextResponse.json({ ok: true });
  }

  const stripe = getStripe(env);
  try {
    const eligible = await findEligibleCustomerByEmail(stripe, env, normalized);
    if (eligible) {
      const token = signRestoreToken(eligible.customerId, normalized, signingSecret);
      const link = `${env.appUrl}/access/restore/confirm?token=${encodeURIComponent(token)}`;
      await sendRestoreEmail(normalized, link);
    }
  } catch (err) {
    // Never let a Stripe error leak into a different response shape than
    // the "no match" case — log it, respond exactly the same.
    console.error("restore access: eligibility lookup failed", err);
  }

  return NextResponse.json({ ok: true });
}
