-- =====================================================
-- Fix: Migrate welcome emails to system_emails table
-- =====================================================

-- 1. Ensure system_emails table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.system_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  body_html text,
  delivery_status text NOT NULL DEFAULT 'pending',
  error_message text,
  attempts int NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Index for efficient processing
CREATE INDEX IF NOT EXISTS idx_system_emails_pending
  ON public.system_emails(delivery_status, created_at)
  WHERE delivery_status = 'pending';

-- 3. Enable RLS
ALTER TABLE public.system_emails ENABLE ROW LEVEL SECURITY;

-- 4. NEW Trigger function - insert into system_emails
CREATE OR REPLACE FUNCTION public.queue_system_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
     AND NEW.email IS NOT NULL
  THEN
    INSERT INTO public.system_emails (
      recipient_email,
      email_type,
      subject,
      body_html,
      delivery_status
    )
    VALUES (
      NEW.email,
      'welcome_founder',
      'Tu cuenta ya esta activa',
      '', -- Generated dynamically by send-pending-emails
      'pending'
    )
    ON CONFLICT DO NOTHING;

    RAISE LOG 'Welcome email queued for: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update trigger to use new function
DROP TRIGGER IF EXISTS trigger_queue_welcome_email ON auth.users;

CREATE TRIGGER trigger_queue_welcome_email
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_system_welcome_email();

-- 6. Grant permissions
GRANT ALL ON public.system_emails TO service_role;

-- 7. Drop old function (no longer needed)
DROP FUNCTION IF EXISTS public.process_welcome_email_queue();

-- 8. Comments
COMMENT ON TABLE public.system_emails IS
'System emails (welcome, alerts, etc) - independent from workflows';
