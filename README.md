# Daily Proof

Daily Proof is a local-first focus and proof-book web app. It is designed to run without user accounts, passwords, analytics, or forced cloud sync.

## Core principles

- No account required
- No tracking
- Proof data stays on the user's device
- Manual export/import for backups
- Stripe Checkout for paid access
- Optional signed access codes for owner, beta, lifetime, and gift access

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local`.

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_MONTHLY_PRICE_ID=
STRIPE_LIFETIME_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
LICENSE_SIGNING_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

For production, add the same values in Vercel under Project Settings → Environment Variables.

## Stripe setup

Create two Stripe products in live mode or test mode. Do not mix test keys with live prices.

1. `Daily Proof Premium`
   - Recurring
   - `$7/month`
   - Use the Stripe Price ID as `STRIPE_MONTHLY_PRICE_ID`

2. `Daily Proof Lifetime`
   - One-time
   - `$70`
   - Use the Stripe Price ID as `STRIPE_LIFETIME_PRICE_ID`

The 3-day trial is implemented in code inside the Checkout Session using `subscription_data.trial_period_days = 3`. The Stripe product does not need a separate trial price.

## Webhook

After deployment, create a Stripe webhook endpoint pointing to:

```text
https://dailyproofhq.com/api/stripe/webhook
```

Recommended events:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## No-account access codes

Daily Proof supports signed access codes for owner access, beta campaigns, gifts, and lifetime access without creating user accounts.

Generate a signing secret:

```bash
openssl rand -hex 32
```

Set it as `LICENSE_SIGNING_SECRET`, then mint codes:

```bash
LICENSE_SIGNING_SECRET=your_secret node scripts/generate-codes.mjs --role owner --count 1
LICENSE_SIGNING_SECRET=your_secret node scripts/generate-codes.mjs --role beta --days 60 --count 20
LICENSE_SIGNING_SECRET=your_secret node scripts/generate-codes.mjs --role lifetime --prefix FOUNDER --count 10
```

Users redeem codes in Settings → Access. The validated license is stored locally on that device.

## Optional code control

Signed codes work without a database. If you want revocation or max-use campaign codes, add Upstash Redis credentials. Without Upstash, signed codes remain valid until their embedded expiry date.

## Build

```bash
npm run build
```

## Important security note

Never paste real Stripe keys or license signing secrets into GitHub, Claude, ChatGPT, screenshots, or public files. Use `.env.local` locally and Vercel Environment Variables in production.
