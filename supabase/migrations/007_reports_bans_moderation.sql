-- ════════════════════════════════════════════════════════════════
-- DASHR — Migration 007: Reports, Bans, Appeals & Moderation
-- Trust & safety infrastructure for production readiness
-- ════════════════════════════════════════════════════════════════

-- ── ENUMS ─────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
    CREATE TYPE public.report_reason AS ENUM (
      'abuse', 'scam', 'fake_order', 'no_show',
      'harassment', 'payment_issue', 'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM (
      'pending', 'reviewing', 'resolved', 'dismissed'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_severity') THEN
    CREATE TYPE public.report_severity AS ENUM (
      'low', 'medium', 'high', 'critical'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ban_type') THEN
    CREATE TYPE public.ban_type AS ENUM ('temporary', 'permanent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appeal_status') THEN
    CREATE TYPE public.appeal_status AS ENUM (
      'pending', 'reviewing', 'approved', 'denied'
    );
  END IF;
END $$;

-- ── USER COLUMNS FOR QUICK BAN CHECK ─────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ban_reason text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS accepted_policy_version text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS accepted_policy_at timestamptz;

-- ── REPORTS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id        uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  reason          public.report_reason NOT NULL,
  notes           text NOT NULL DEFAULT '',
  evidence_urls   jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          public.report_status NOT NULL DEFAULT 'pending',
  severity        public.report_severity,
  admin_notes     text,
  resolved_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Can't report yourself
  CONSTRAINT reports_no_self CHECK (reporter_id <> reported_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: read own reports" ON public.reports;
CREATE POLICY "Users: read own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users: insert own reports" ON public.reports;
CREATE POLICY "Users: insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admin: full reports" ON public.reports;
CREATE POLICY "Admin: full reports" ON public.reports
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user
  ON public.reports (reported_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter
  ON public.reports (reporter_id, created_at DESC);

-- ── BANS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bans (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  banned_by         uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ban_type          public.ban_type NOT NULL,
  reason            text NOT NULL,
  related_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  starts_at         timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz, -- NULL = permanent
  is_active         boolean NOT NULL DEFAULT true,
  unbanned_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  unbanned_at       timestamptz,
  unban_reason      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- Banned users can see their own bans (so they know why)
DROP POLICY IF EXISTS "Users: read own bans" ON public.bans;
CREATE POLICY "Users: read own bans" ON public.bans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin: full bans" ON public.bans;
CREATE POLICY "Admin: full bans" ON public.bans
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_bans_user_active
  ON public.bans (user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bans_expires
  ON public.bans (expires_at) WHERE is_active = true AND expires_at IS NOT NULL;

-- ── APPEALS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.appeals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ban_id          uuid NOT NULL REFERENCES public.bans(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  appeal_text     text NOT NULL,
  status          public.appeal_status NOT NULL DEFAULT 'pending',
  admin_response  text,
  reviewed_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- One appeal per ban
  UNIQUE(ban_id)
);

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: read own appeals" ON public.appeals;
CREATE POLICY "Users: read own appeals" ON public.appeals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users: insert own appeals" ON public.appeals;
CREATE POLICY "Users: insert own appeals" ON public.appeals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin: full appeals" ON public.appeals;
CREATE POLICY "Admin: full appeals" ON public.appeals
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_appeals_status
  ON public.appeals (status, created_at DESC);

-- ── MODERATION AUDIT LOG ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  action            text NOT NULL,
  target_user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_entity_id  uuid,  -- report/ban/appeal ID
  details           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: read audit log" ON public.moderation_audit_log;
CREATE POLICY "Admin: read audit log" ON public.moderation_audit_log
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admin: insert audit log" ON public.moderation_audit_log;
CREATE POLICY "Admin: insert audit log" ON public.moderation_audit_log
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_created
  ON public.moderation_audit_log (admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_user
  ON public.moderation_audit_log (target_user_id, created_at DESC);

-- ── AUTO-EXPIRE TEMPORARY BANS ───────────────────────────────
-- Call this periodically or use a Supabase cron extension

CREATE OR REPLACE FUNCTION public.expire_temporary_bans()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired temp bans as inactive
  UPDATE public.bans
  SET is_active = false
  WHERE is_active = true
    AND ban_type = 'temporary'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  -- Unban users whose only active ban just expired
  UPDATE public.users u
  SET is_banned = false, ban_reason = NULL
  WHERE u.is_banned = true
    AND NOT EXISTS (
      SELECT 1 FROM public.bans b
      WHERE b.user_id = u.id AND b.is_active = true
    );
END;
$$;

-- ── STORAGE BUCKET FOR REPORT EVIDENCE ───────────────────────
-- Run manually in Supabase or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('report-evidence', 'report-evidence', false);
--
-- Policies (extremely restrictive):
-- • Upload: only authenticated users, max 3 files, only images
-- • Read: admin only
-- • Delete: admin only
-- • No public access whatsoever

-- ── REALTIME ─────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
