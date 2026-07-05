#!/usr/bin/env node
// Mints signed Daily Proof access codes. No database required.
//
//   LICENSE_SIGNING_SECRET=... node scripts/generate-codes.mjs \
//     --role beta --days 60 --count 5 [--prefix FOUNDER] [--max-uses 1]
//
// Roles: owner | lifetime | premium | beta. Omit --days for never-expiring.
// --max-uses prints the store command to register a use limit (needs Upstash).

import { createHmac, randomBytes } from "crypto";

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : [])).filter((p) => p.length)
);
const secret = process.env.LICENSE_SIGNING_SECRET;
if (!secret) {
  console.error("Set LICENSE_SIGNING_SECRET first.");
  process.exit(1);
}
const role = args.role;
const ROLE_CHAR = { owner: "O", lifetime: "L", premium: "P", beta: "B" };
const DEFAULT_PREFIX = { owner: "OWNER", lifetime: "LIFE", premium: "PRO", beta: "BETA" };
const PREFIX_ROLE = { OWNER: "owner", LIFE: "lifetime", FOUNDER: "lifetime", PRO: "premium", BETA: "beta" };
if (!ROLE_CHAR[role]) {
  console.error("--role must be owner|lifetime|premium|beta");
  process.exit(1);
}
const prefix = (args.prefix ?? DEFAULT_PREFIX[role]).toUpperCase();
if (PREFIX_ROLE[prefix] !== role) {
  console.error(`Prefix ${prefix} does not match role ${role}`);
  process.exit(1);
}
const count = Number(args.count ?? 1);
const days = args.days ? Number(args.days) : null;

const B32 = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const b32 = (bytes, len) => {
  let out = "";
  for (let i = 0; out.length < len; i++) out += B32[bytes[i % bytes.length] % B32.length];
  return out;
};
const encodeExpiry = () => {
  if (!days) return "0000";
  const d = Math.ceil((Date.now() + days * 86400000 - Date.UTC(2026, 0, 1)) / 86400000);
  return Math.max(1, d).toString(36).toUpperCase().padStart(4, "0");
};

for (let i = 0; i < count; i++) {
  const payload = `${ROLE_CHAR[role]}${encodeExpiry()}${b32(randomBytes(8), 4)}`;
  const sig = b32(createHmac("sha256", secret).update(payload).digest(), 10);
  const code = `${prefix}-${payload}-${sig}`;
  console.log(code);
  if (args["max-uses"]) {
    console.log(`  # register use limit (Upstash): license:${payload} max_uses=${args["max-uses"]}`);
  }
}
