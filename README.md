# DASHR

Campus delivery, but make it organized.

DASHR is a Next.js app for placing, tracking, and completing student delivery orders with role-based flows for customers, agents, and admins. It includes OTP-based sign-up, order lifecycle APIs, admin strike management, and ID verification support for onboarding agents.

If food delivery apps are a symphony, this repo is the drummer yelling "keep time" at everyone.

## What This Project Does

- Lets customers place and track orders.
- Lets agents accept, manage, and complete active deliveries.
- Lets admins manage moderation workflows like strike handling.
- Uses Supabase for auth + data.
- Supports OTP email auth and onboarding flows.
- Includes OCR-assisted ID verification path for agent onboarding.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Tailwind CSS 4
- Nodemailer (OTP emails)
- Tesseract.js (ID OCR)

## Project Structure

High-value directories:

- `app/` — routes, pages, and API handlers
- `app/api/auth/*` — OTP + signup + password reset APIs
- `app/api/orders/*` — order actions (accept, cancel, rate)
- `app/api/admin/*` — admin controls (strikes, etc.)
- `components/` — reusable UI blocks
- `lib/` — config, helpers, Supabase clients, mail logic
- `supabase/migrations/` — SQL migrations and schema changes
- `types/` — shared TypeScript types

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` with at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# required when email OTP is enabled
GMAIL_USER=...
GMAIL_APP_PASSWORD=...

# optional
NEXT_PUBLIC_UPI_ID=dashr@upi
```

Notes:

- `lib/config.ts` validates required env vars.
- OTP email flow expects valid Gmail credentials when enabled.

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Feature Flags and Tunables

Core runtime switches live in `lib/config.ts`:

- `FEATURES.EMAIL_OTP`
- `FEATURES.OCR_VERIFICATION`
- `FEATURES.REALTIME_ORDERS`
- `FEATURES.PRIORITY_QUEUE`
- `FEATURES.UPI_PAYMENTS`

Also configurable:

- commission floors by zone
- payment threshold (`AGENT_FLOAT_THRESHOLD`)
- strike offboarding threshold (`STRIKES_TO_OFFBOARD`)

This means product changes can happen by editing one config file instead of launching a quest across 19 tabs.

## Database

Supabase migrations are in `supabase/migrations/`.

Current migration set includes:

- initial schema
- OTP support and fixes
- RLS recursion fix
- storage policies
- ratings and additional fixes

Apply migrations with your preferred Supabase workflow before testing auth/order features.

## API Surface (Quick View)

Examples from the current app:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/signup`
- `POST /api/auth/reset-password`
- `POST /api/agent/verify-id`
- `POST /api/orders/accept`
- `POST /api/orders/cancel`
- `POST /api/orders/rate`
- admin strike routes under `/api/admin/strikes`

## How To Contribute Without Breaking Reality

1. Pull latest changes.
2. Run `npm install` and `npm run lint`.
3. Keep changes focused; avoid rewriting unrelated files.
4. If you touch auth, test OTP and signup paths.
5. If you touch agent onboarding, test ID verification edge cases.

## Troubleshooting

- App boots but auth fails:
	Check Supabase env vars first.
- OTP not sending:
	Check `GMAIL_USER` and `GMAIL_APP_PASSWORD`.
- ID verification weirdness:
	OCR is best-effort; review fallback behavior in `app/api/agent/verify-id/route.ts`.

## Final Note

This codebase is serious about delivery flow, but not serious enough to pretend every bug is "expected behavior." If something looks odd, it probably is. Open an issue, fix it, and claim hero status.
