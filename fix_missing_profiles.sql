-- Check if profiles has RLS
-- Create an RPC to safely force a profile creation (can be used by admins)
CREATE OR REPLACE FUNCTION public.force_create_profile(
  target_user_id UUID,
  target_email TEXT,
  target_full_name TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_active, created_at)
  VALUES (target_user_id, target_email, target_full_name, TRUE, NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Let's also ensure the trigger is robust and handles full_name from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, is_active)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.created_at, 
    TRUE
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    created_at = COALESCE(public.profiles.created_at, EXCLUDED.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manually sync any missing profiles
INSERT INTO public.profiles (id, email, full_name, created_at, is_active)
SELECT 
  id, 
  email, 
  raw_user_meta_data->>'full_name',
  created_at, 
  TRUE
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
