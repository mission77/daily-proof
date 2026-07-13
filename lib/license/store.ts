// Optional server-side license store (Upstash Redis over REST — plain fetch,
// no SDK). When UPSTASH_REDIS_REST_URL/TOKEN are absent, everything degrades
// gracefully: signed codes still validate statelessly, but max-use counting,
// revocation, and Stripe-created license records are skipped.
//
// License record shape (the "license table"):
//   license:{codeId} -> { role, status, expires_at, stripe_customer_id?, created_at,
//                         max_uses?, remaining_uses? }

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export function storeConfigured(): boolean {
  return Boolean(url && token);
}

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${url}/${cmd.map((c) => encodeURIComponent(String(c))).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`store error ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export interface LicenseRecord {
  role: string;
  status: "active" | "past_due" | "canceled" | "revoked";
  expires_at: string | null;
  stripe_customer_id?: string;
  created_at: string;
  max_uses?: number;
  remaining_uses?: number;
}

export async function getLicense(codeId: string): Promise<LicenseRecord | null> {
  const raw = (await redis(["GET", `license:${codeId}`])) as string | null;
  return raw ? (JSON.parse(raw) as LicenseRecord) : null;
}

export async function putLicense(codeId: string, record: LicenseRecord): Promise<void> {
  await redis(["SET", `license:${codeId}`, JSON.stringify(record)]);
}

/** Registers a gift code with a use limit. Run once per generated code (the
 *  generate-codes script prints the matching command). */
export async function registerGiftCode(
  codeId: string,
  role: string,
  expiresAt: string | null,
  maxUses: number
): Promise<void> {
  await putLicense(codeId, {
    role,
    status: "active",
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    max_uses: maxUses,
    remaining_uses: maxUses,
  });
}

export type RedeemCheck =
  | { allowed: true }
  | { allowed: false; reason: "revoked" | "exhausted" | "past_due" };

/** Checks store-side state for a code and consumes one use when limited.
 *  Codes unknown to the store are allowed (stateless signed codes). */
export async function checkAndConsume(codeId: string): Promise<RedeemCheck> {
  const rec = await getLicense(codeId);
  if (!rec) return { allowed: true };
  if (rec.status === "revoked") return { allowed: false, reason: "revoked" };
  if (rec.status === "past_due" || rec.status === "canceled")
    return { allowed: false, reason: "past_due" };
  if (typeof rec.remaining_uses === "number") {
    if (rec.remaining_uses <= 0) return { allowed: false, reason: "exhausted" };
    rec.remaining_uses -= 1;
    await putLicense(codeId, rec);
  }
  return { allowed: true };
}

/** Stripe hooks call these to keep subscription-backed licenses in sync. */
export async function upsertStripeLicense(
  customerId: string,
  role: "premium" | "lifetime",
  status: LicenseRecord["status"]
): Promise<void> {
  await putLicense(`stripe:${customerId}`, {
    role,
    status,
    expires_at: null,
    stripe_customer_id: customerId,
    created_at: new Date().toISOString(),
  });
}
