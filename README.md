# DASHR

Campus delivery, but make it organized.

DASHR is a Next.js app for placing, tracking, and completing student delivery orders with role-based flows for customers, agents, and admins. It includes OTP-based sign-up, order lifecycle APIs, admin strike management, and ID verification support for onboarding agents.

If food delivery apps are a symphony, this repo is the drummer yelling "keep time" at everyone.

## What This Project Does

- Lets customers place and track orders.
- Lets agents accept, manage, and complete active deliveries.
- Lets admins manage moderation workflows like strike handling.
- Uses Supabase for auth + data.
- Uses realtime in-app notifications as the primary communication channel.
- Uses Brevo for OTP and selective high-value transactional emails.
- Includes OCR-assisted ID verification path for agent onboarding.
- **Progressive Web App (PWA)** with offline support, installable on all devices.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Supabase Realtime (in-app notifications)
- Tailwind CSS 4
- Brevo Transactional API (OTP + selective transactional emails)
- Tesseract.js (ID OCR)

## Project Structure

High-value directories:

- `app/` — routes, pages, and API handlers
- `app/api/auth/*` — OTP + signup + password reset APIs
- `app/api/orders/*` — order lifecycle APIs (create, accept, update-status, cancel, rate)
- `app/api/admin/*` — admin controls (strikes, etc.)
- `components/` — reusable UI blocks
- `components/NotificationBell.tsx` — realtime notification UI with CSS module styling
- `components/NotificationBell.module.css` — professional notification panel styles
- `lib/` — config, helpers, Supabase clients, mail logic, communication policy
- `lib/communication-policy.ts` — selective email policy + daily budget enforcement
- `public/` — static assets, favicons, PWA service worker, manifest
- `public/manifest.json` — PWA app manifest with shortcuts and icon definitions
- `public/sw.js` — Service Worker for offline support and caching
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
BREVO_API_KEY=...
BREVO_SENDER_EMAIL=no-reply@yourdomain.com
BREVO_SENDER_NAME=DASHR

# optional email throttling
EMAIL_DAILY_SOFT_LIMIT=260
EMAIL_DASHER_MIN_COMMISSION=70
EMAIL_DASHER_MAX_RECIPIENTS=3
EMAIL_DASHER_COOLDOWN_MINUTES=45

# optional
NEXT_PUBLIC_UPI_ID=dashr@upi
```

Notes:

- `lib/config.ts` validates required env vars.
- OTP and transactional emails are sent via Brevo API.
- `BREVO_SENDER_EMAIL` must be an active/verified Brevo sender (or verified domain sender).
- After changing env vars, restart `npm run dev`.

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

## Communication Architecture

- Primary channel: realtime in-app notifications via `public.notifications` + Supabase Realtime.
- Secondary channel: Brevo email for only high-value events.
- Email budget policy is enforced in `lib/communication-policy.ts` with `EMAIL_DAILY_SOFT_LIMIT`, `EMAIL_DASHER_MIN_COMMISSION`, `EMAIL_DASHER_MAX_RECIPIENTS`, and `EMAIL_DASHER_COOLDOWN_MINUTES`.

### Event Routing (In-App vs Email)

- OTP request: Email (required)
- Order placed: In-app customer confirmation + in-app dasher availability
- New high-value order: Optional email to top dashers (policy-gated)
- Order accepted: In-app updates + customer confirmation email
- Picked up / out for delivery: In-app updates only
- Delivered: In-app updates + customer completion email
- Cancelled: In-app updates only

## Database

Supabase migrations are in `supabase/migrations/`.

Current migration set includes:

- initial schema
- OTP support and fixes
- RLS recursion fix
- storage policies
- ratings and additional fixes
- notifications and email logs (`006_notifications_and_email_logs.sql`)

Apply migrations with your preferred Supabase workflow before testing auth/order features.

## API Surface (Quick View)

Examples from the current app:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/signup`
- `POST /api/auth/reset-password`
- `POST /api/agent/verify-id`
- `POST /api/orders/create`
- `POST /api/orders/accept`
- `POST /api/orders/update-status`
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
	Check `BREVO_API_KEY` and sender identity (`BREVO_SENDER_EMAIL`) in Brevo.
- OTP API returns 200 but no email arrives:
	1. Open Brevo Transactional logs and check event reason.
	2. If reason says sender is invalid, verify/activate that sender in Brevo.
	3. Ensure `.env.local` sender exactly matches an active Brevo sender email.
	4. Restart dev server after env changes.
- Realtime notifications not appearing:
	1. Ensure migration `006_notifications_and_email_logs.sql` is applied.
	2. Confirm `public.notifications` is in `supabase_realtime` publication.
	3. Verify the signed-in user matches `notifications.user_id` under RLS.
- ID verification weirdness:
	OCR is best-effort; review fallback behavior in `app/api/agent/verify-id/route.ts`.

## Final Note

This codebase is serious about delivery flow, but not serious enough to pretend every bug is "expected behavior." If something looks odd, it probably is. Open an issue, fix it, and claim hero status.

## Progressive Web App (PWA) Features

DASHR is a full PWA, meaning:

- **Install on Home Screen**: Users can install DASHR directly from their browser (Chrome, Firefox, Safari on iOS) without the App Store.
- **Offline Support**: Service worker caches critical assets and API calls, allowing basic navigation offline.
- **App Shell**: Runs in standalone mode (full screen, no browser chrome) on mobile and desktop.
- **Push Notifications**: Foundation ready for native push notifications (WebPush API).
- **Icons & Branding**: Custom adaptive icons for all device types (Android, iOS, Windows, macOS).

### Installation Instructions

**Mobile/Desktop (Android, iOS, macOS, Windows):**

1. Open DASHR in your browser
2. Look for an "Install" or "Add to Home Screen" prompt
3. Tap/click it, confirm the installation
4. DASHR now appears as a native app on your home screen

**On iOS:**

1. Open DASHR in Safari
2. Tap the Share button (square with arrow)
3. Scroll and select "Add to Home Screen"
4. DASHR now available as a shortcut

**Offline Mode:**

- Network-first strategy for API calls (fresh data when online, cached on retry)
- Cache-first for static assets (instant load, background refresh)
- Graceful fallback on total offline (shows offline notice, retries on reconnect)
