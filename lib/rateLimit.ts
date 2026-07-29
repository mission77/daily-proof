// Architectural note: this is an in-memory, per-instance rate limiter — a
// deliberate choice for the current launch stage, not an oversight. It is
// dependency-free (no Redis, no external service) and sufficient to blunt
// accidental abuse and simple single-origin attacks, which is the actual
// threat model right now. It resets on cold start and isn't shared across
// instances or regions, so it is not a hard guarantee against a determined,
// distributed attacker.
//
// If Daily Proof scales to multiple concurrent server instances, replace
// the bucket storage below with a shared, distributed limiter (e.g.
// Upstash Redis, following the same optional/degrade-gracefully pattern
// already used in lib/license/store.ts) without changing the public
// rateLimit()/clientKey() API — every call site stays the same.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000; // cap memory on a long-lived instance

/** True if the call is allowed; false if `key` has exceeded `limit` calls
 *  within the current `windowMs` window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_BUCKETS) {
      const oldest = Array.from(buckets.entries())
        .sort((a, b) => a[1].resetAt - b[1].resetAt)
        .slice(0, 1000);
      for (const [k] of oldest) buckets.delete(k);
    }
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Best-effort caller identity from proxy headers. Falls back to a shared
 *  bucket for requests with no forwarding header (e.g. local dev) rather
 *  than throwing — that bucket is still rate-limited, just coarsely. */
export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
