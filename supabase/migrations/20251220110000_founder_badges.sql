-- =====================================================
-- Founder badges: asignar número único e incluirlo en emails
-- =====================================================

-- 1) Secuencia para numerar badges
CREATE SEQUENCE IF NOT EXISTS public.founder_badges_seq START 1;

-- 2) Tabla de badges
CREATE TABLE IF NOT EXISTS public.founder_badges (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_number integer NOT NULL UNIQUE DEFAULT nextval('public.founder_badges_seq'),
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Permisos
GRANT SELECT, INSERT, UPDATE ON public.founder_badges TO service_role;

-- 4) Añadir metadata opcional a system_emails para pasar founder_number y nombre
ALTER TABLE public.system_emails
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 5) Reemplazar trigger para encolar welcome email con founder_number
CREATE OR REPLACE FUNCTION public.queue_system_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  badge_num integer;
  full_name text;
BEGIN
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
     AND NEW.email IS NOT NULL
  THEN
    full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL);

    -- Asignar badge si no existe
    INSERT INTO public.founder_badges (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT badge_number INTO badge_num
    FROM public.founder_badges
    WHERE user_id = NEW.id;

    INSERT INTO public.system_emails (
      recipient_email,
      email_type,
      subject,
      body_html,
      delivery_status,
      metadata
    )
    VALUES (
      NEW.email,
      'welcome_founder',
      'Bienvenido a EcoSign — Usuario Founder',
      '', -- se generará en la función de envío
      'pending',
      jsonb_build_object(
        'user_id', NEW.id,
        'user_name', full_name,
        'founder_number', badge_num
      )
    )
    ON CONFLICT DO NOTHING;

    RAISE LOG 'Welcome email queued for: %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6) Re-crear trigger (idempotente)
DROP TRIGGER IF EXISTS trigger_queue_welcome_email ON auth.users;

CREATE TRIGGER trigger_queue_welcome_email
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_system_welcome_email();
