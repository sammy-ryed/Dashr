-- DASHR — Migration 006: Notifications + Email Logs
-- Adds in-app notifications (realtime) and email audit logs for budget-aware delivery.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'notification_kind' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.notification_kind AS ENUM (
      'order_placed',
      'order_available',
      'order_assigned_customer',
      'order_assigned_agent',
      'order_picked_up',
      'order_delivered',
      'order_cancelled',
      'order_issue'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id   uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  kind       public.notification_kind NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: read own notifications" ON public.notifications;
CREATE POLICY "Users: read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users: update own notifications" ON public.notifications;
CREATE POLICY "Users: update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin: full notifications" ON public.notifications;
CREATE POLICY "Admin: full notifications" ON public.notifications
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type          text NOT NULL CHECK (
    event_type IN (
      'otp',
      'order_accepted_customer',
      'order_delivered_customer',
      'order_opportunity_dasher'
    )
  ),
  recipient_email     text NOT NULL,
  order_id            uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  status              text NOT NULL CHECK (
    status IN ('sent', 'failed', 'skipped_quota', 'skipped_policy')
  ),
  provider            text NOT NULL DEFAULT 'brevo',
  provider_message_id text,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin: read email logs" ON public.email_logs;
CREATE POLICY "Admin: read email logs" ON public.email_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_email_logs_created_status
  ON public.email_logs (created_at DESC, status);

CREATE INDEX IF NOT EXISTS idx_email_logs_event_recipient_created
  ON public.email_logs (event_type, recipient_email, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
    VALUES (
      NEW.customer_id,
      NEW.id,
      'order_placed',
      'Order placed successfully',
      'Your order is live. Dashers can now accept it.',
      jsonb_build_object('status', NEW.status)
    );

    INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
    SELECT
      u.id,
      NEW.id,
      'order_available',
      'New delivery opportunity',
      format(
        'Commission ₹%s from %s to %s.',
        NEW.commission_amount,
        NEW.pickup_location,
        NEW.delivery_hostel
      ),
      jsonb_build_object('status', NEW.status, 'commission', NEW.commission_amount)
    FROM public.users u
    WHERE u.role = 'agent'
      AND u.is_verified = true
      AND u.is_online = true
      AND u.id <> NEW.customer_id;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'assigned' THEN
      INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_assigned_customer',
        'Order accepted',
        'A dasher accepted your order and will start soon.',
        jsonb_build_object('status', NEW.status, 'agent_id', NEW.agent_id)
      );

      IF NEW.agent_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
        VALUES (
          NEW.agent_id,
          NEW.id,
          'order_assigned_agent',
          'Order assigned to you',
          'You successfully accepted this order.',
          jsonb_build_object('status', NEW.status)
        );
      END IF;

      RETURN NEW;
    END IF;

    IF NEW.status = 'picked_up' THEN
      INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_picked_up',
        'Out for delivery',
        'Your order was picked up and is on the way.',
        jsonb_build_object('status', NEW.status)
      );

      IF NEW.agent_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
        VALUES (
          NEW.agent_id,
          NEW.id,
          'order_picked_up',
          'Status updated: picked up',
          'Customer has been notified that the order is on the way.',
          jsonb_build_object('status', NEW.status)
        );
      END IF;

      RETURN NEW;
    END IF;

    IF NEW.status = 'delivered' THEN
      INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_delivered',
        'Order delivered',
        'Delivery completed successfully. Please rate your dasher.',
        jsonb_build_object('status', NEW.status)
      );

      IF NEW.agent_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
        VALUES (
          NEW.agent_id,
          NEW.id,
          'order_delivered',
          'Delivery marked complete',
          'The delivery is now completed.',
          jsonb_build_object('status', NEW.status)
        );
      END IF;

      RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
      INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_cancelled',
        'Order cancelled',
        'Your order has been cancelled.',
        jsonb_build_object('status', NEW.status)
      );

      IF COALESCE(NEW.agent_id, OLD.agent_id) IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, order_id, kind, title, message, payload)
        VALUES (
          COALESCE(NEW.agent_id, OLD.agent_id),
          NEW.id,
          'order_cancelled',
          'Order cancelled',
          'This delivery was cancelled.',
          jsonb_build_object('status', NEW.status)
        );
      END IF;

      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_notifications ON public.orders;
CREATE TRIGGER trg_orders_notifications
  AFTER INSERT OR UPDATE OF status, agent_id ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_notifications();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;
