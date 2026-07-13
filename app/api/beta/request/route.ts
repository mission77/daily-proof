import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** POST /api/beta/request { email }
 *  Creates a contact in Loops for the Founding Beta invitation. The API key
 *  never reaches the client. The email is used for the invitation only — no
 *  analytics, no newsletter, no tracking. */
export async function POST(req: NextRequest) {
  let email: unknown;
  try {
    email = (await req.json())?.email;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "beta_signups_not_configured" }, { status: 503 });
  }

  try {
    const res = await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        source: "founding-beta",
        userGroup: "founding-beta",
      }),
      cache: "no-store",
    });

    if (res.ok) return NextResponse.json({ ok: true });

    // Loops returns 409 for an existing contact — already on the list is a
    // success from the person's point of view.
    if (res.status === 409) return NextResponse.json({ ok: true, existing: true });

    const body = await res.text();
    if (body.toLowerCase().includes("already")) {
      return NextResponse.json({ ok: true, existing: true });
    }
    console.error("Loops error:", res.status, body.slice(0, 200));
    return NextResponse.json({ error: "signup_failed" }, { status: 502 });
  } catch (err) {
    console.error("Loops request failed:", err);
    return NextResponse.json({ error: "signup_failed" }, { status: 502 });
  }
}
