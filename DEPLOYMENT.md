# DASHR — Deployment Guide

> Last updated: April 2026

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18.17+ |
| npm | 9+ |
| Supabase CLI | latest |

---

## 1. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the following:

```env
# Supabase (find in: Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App URL — must match your production domain for CSRF checks to work
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

# Email (Brevo Transactional API — https://www.brevo.com)
# The sender email must be a verified sender in your Brevo account
BREVO_API_KEY=<your-brevo-api-key>
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=DASHR
```

> ⚠️ **Never commit `.env.local` to git.** It is already in `.gitignore`.
> Set all secrets in your Vercel / CI dashboard for production deployments.

---

## 2. Database Migrations

Run all migrations in order against your production Supabase project:

```bash
# Using Supabase CLI
supabase db push

# Or manually via the Supabase SQL Editor:
# Run migrations 001 through 008 in sequence
```

Migrations are in `supabase/migrations/`:
- `001_init.sql` — Core tables
- `002_otp_and_fixes.sql` — OTP authentication
- `003_fix_rls_recursion.sql` — RLS policy fixes
- `004_storage_policies.sql` — Storage bucket policies
- `005_ratings_and_fixes.sql` — Ratings table
- `006_notifications_and_email_logs.sql` — Notifications & email logging
- `007_reports_bans_moderation.sql` — Trust & Safety tables
- `008_atomic_increment_rpc.sql` — Atomic delivery counter RPC (**new**)

---

## 3. Supabase Storage Buckets

Create the following buckets in the Supabase dashboard under **Storage**:

| Bucket name | Public? | Purpose |
|---|---|---|
| `id-cards` | ❌ Private | Dasher ID card uploads |

RLS policies for `id-cards`:
- Users can upload to their own subfolder: `storage.foldername(name)[1] = auth.uid()::text`
- Admins can read all

---

## 4. Build & Deploy

### Vercel (recommended)

1. Push to GitHub
2. Connect repo on [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard (see section 1 above)
4. Deploy

### Manual

```bash
npm install
npm run build
npm run start
```

---

## 5. Admin Account Setup

There is no admin UI for creating admin accounts. Do this manually in Supabase:

```sql
-- In the Supabase SQL editor, after the user signs up:
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@srm.edu.in';
```

---

## 6. Post-Deploy Checklist

See `PRODUCTION_CHECKLIST.md` for the full launch checklist.

Key items:
- [ ] `NEXT_PUBLIC_APP_URL` matches your production domain (critical for CSRF)
- [ ] Brevo sender email is verified (SPF/DKIM configured for your domain)
- [ ] All migrations run including `008_atomic_increment_rpc.sql`
- [ ] Supabase realtime enabled for `orders` table
- [ ] RLS enabled on all tables (verify in Supabase dashboard)
- [ ] Admin account created in Supabase
- [ ] Storage bucket `id-cards` created with correct RLS

---

## 7. Rollback

```bash
# To roll back a deployment on Vercel, use the dashboard or:
vercel rollback [deployment-url]
```

For database rollbacks, migrations are one-way. Maintain backup snapshots before running migrations in production.

---

## Monitoring

- **Logs**: Vercel dashboard → Functions → Logs (structured JSON)
- **Health check**: `GET /api/admin/health` (admin-only)
- **Supabase metrics**: Supabase dashboard → Database → Reports
