-- Ensure created_at exists on profiles table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='created_at') THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Backfill created_at from auth.users if possible
UPDATE public.profiles
SET created_at = auth.users.created_at
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.created_at IS NULL;
