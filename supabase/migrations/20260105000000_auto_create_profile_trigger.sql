-- ============================================
-- Auto-create profile on user signup
-- ============================================
-- This trigger creates a profile row automatically when a new user signs up
-- Prevents "No se pudo inicializar el cifrado" error for new users

-- Function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate wrap_salt (32 hex chars = 16 bytes)
  INSERT INTO public.profiles (user_id, wrap_salt)
  VALUES (
    NEW.id,
    substring(md5(gen_random_uuid()::text || NEW.id::text) from 1 for 32)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user()
IS 'Automatically creates a profile with wrap_salt when a new user signs up';
