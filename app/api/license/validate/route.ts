import { NextRequest, NextResponse } from "next/server";
import { verifyCodeWithRotation } from "@/lib/license/codes";
import { checkAndConsume, storeConfigured } from "@/lib/license/store";
import { verificationSecrets } from "@/lib/license/secrets";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** POST /api/license/validate { code }
 *  Validates an access code. No accounts, no login: a valid code returns the
 *  role and expiry, which the client stores locally. */
export async function POST(req: NextRequest) {
  if (!rateLimit(`license-validate:${clientKey(req)}`, 20, 60_000)) {
    return NextResponse.json({ valid: false, reason: "rate_limited" }, { status: 429 });
  }

  const secrets = verificationSecrets();
  if (secrets.length === 0) {
    return NextResponse.json({ error: "licenses_not_configured" }, { status: 503 });
  }

  let code: unknown;
  try {
    code = (await req.json())?.code;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof code !== "string" || code.length < 8 || code.length > 64) {
    return NextResponse.json({ valid: false, reason: "malformed" }, { status: 200 });
  }

  // Tries the current signing key first, then any retired ones — a code
  // signed before a key rotation must keep validating.
  const result = verifyCodeWithRotation(code, secrets);
  if (!result.ok) {
    return NextResponse.json({ valid: false, reason: result.reason }, { status: 200 });
  }

  // Optional store layer: revocation and max-use counting.
  if (storeConfigured()) {
    try {
      const check = await checkAndConsume(result.license.codeId);
      if (!check.allowed) {
        return NextResponse.json({ valid: false, reason: check.reason }, { status: 200 });
      }
    } catch (err) {
      console.error("license store error:", err);
      // Store trouble must not lock out legitimately signed codes.
    }
  }

  return NextResponse.json({
    valid: true,
    role: result.license.role,
    expiresAt: result.license.expiresAt,
  });
}
