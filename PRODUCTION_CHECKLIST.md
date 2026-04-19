# DASHR — Production Launch Checklist

Use this checklist before going live. Each section must be fully checked.

---

## 🔐 Security

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only as a server-side env var (not `NEXT_PUBLIC_`)
- [ ] `NEXT_PUBLIC_APP_URL` is set to the real production domain
- [ ] RLS (Row Level Security) is **enabled** on all tables in Supabase
- [ ] Service role key is **not** exposed to client-side code
- [ ] No `console.log` calls with sensitive data (PII, keys) in deployed code
- [ ] Rate limiting is active on all auth and mutation endpoints
- [ ] CSRF origin check is active (requires `NEXT_PUBLIC_APP_URL` to be set)

## 🗄️ Database

- [ ] All 7 migrations have been applied (verify in Supabase → Database → Migrations)
- [ ] `users` table has `is_banned`, `ban_reason`, `accepted_policy_version`, `accepted_policy_at` columns
- [ ] `reports`, `bans`, `appeals`, `moderation_audit_log` tables exist
- [ ] RLS policies verified on `reports`, `bans`, `appeals` tables
- [ ] Test: place a test order and verify it appears in `orders` table

## 📧 Email

- [ ] Resend domain is verified (check DNS records)
- [ ] `EMAIL_FROM` matches verified Resend domain
- [ ] Test: trigger an order and verify the dasher receives the opportunity email
- [ ] Test: trigger a delivery and verify the customer receives the delivery email
- [ ] Email delivery rate > 95% (check `/api/admin/health`)

## 👤 Auth

- [ ] Supabase email OTP is enabled
- [ ] Signups are allowed (or restricted to `@srmist.edu.in` if desired)
- [ ] Admin account exists with `role = 'admin'` in `public.users`
- [ ] Test: login flow works end-to-end (OTP → onboarding → dashboard)

## 📦 Storage

- [ ] `id-cards` bucket exists in Supabase Storage
- [ ] Bucket RLS policy prevents users from viewing others' ID cards
- [ ] Test: dasher registration uploads ID card successfully

## 🔔 Real-time

- [ ] Supabase Realtime is enabled for the `notifications` table
- [ ] Test: place an order, accept it as a dasher, verify the customer gets a real-time notification

## 🛡️ Trust & Safety

- [ ] Test: create a report, verify it appears in Admin → Reports tab
- [ ] Test: ban a user, verify they're redirected to `/banned`
- [ ] Test: submit an appeal, verify it appears in Admin → Moderation tab
- [ ] Test: approve an appeal, verify the ban is lifted

## 📜 Legal

- [ ] `/terms` page loads correctly
- [ ] `/privacy` page loads correctly
- [ ] `/refund-policy` page loads correctly
- [ ] Policy acceptance checkbox appears on onboarding
- [ ] `accepted_policy_version` is saved to the DB on onboarding completion
- [ ] TODO: Have a lawyer review all three policy documents before launch

## 🚀 Performance

- [ ] `npm run build` completes with no errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Lighthouse score > 80 on mobile
- [ ] Test on a mobile device (iPhone/Android) for layout issues

## 🔍 Admin Panel

- [ ] Login with admin account → redirected to `/admin`
- [ ] Orders tab shows all orders
- [ ] Dashers tab shows all agents with correct strike counts
- [ ] Payouts tab shows unpaid ledger entries
- [ ] Reports tab loads and shows submitted reports
- [ ] Moderation tab shows active bans and pending appeals
- [ ] Health tab shows system metrics

## ♻️ Monitoring

- [ ] Vercel function logs accessible
- [ ] `/api/admin/health` returns valid JSON with current metrics
- [ ] Error alerts configured (Vercel or external)

---

## Post-Launch (First Week)

- [ ] Monitor email delivery rate daily
- [ ] Check admin Reports tab for any abuse in the first 48h
- [ ] Verify no unusual 429 (rate limit) errors in logs
- [ ] Confirm first real order was placed and delivered successfully
