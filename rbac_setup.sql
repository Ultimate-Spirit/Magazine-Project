-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_system_admin BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert hardcoded Admin role
INSERT INTO roles (name, is_system_admin, permissions)
VALUES ('Admin', TRUE, '{
    "can_create_folders": true,
    "can_edit_own_folders": true,
    "can_edit_all_folders": true,
    "can_delete_own_folders": true,
    "can_delete_all_folders": true,
    "can_create_publications": true,
    "can_edit_own_publications": true,
    "can_edit_all_publications": true,
    "can_delete_own_publications": true,
    "can_delete_all_publications": true
}'::jsonb)
ON CONFLICT (name) DO UPDATE 
SET is_system_admin = TRUE, 
    permissions = EXCLUDED.permissions;

-- User Companies Junction Table
CREATE TABLE IF NOT EXISTS user_companies (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, company_id)
);

-- Add role_id to profiles if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role_id') THEN
        ALTER TABLE profiles ADD COLUMN role_id UUID REFERENCES roles(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Simple policies for admin access (assuming service role or admin profile check)
CREATE POLICY "Admins can manage roles" ON roles FOR ALL USING (true);
CREATE POLICY "Admins can manage user_companies" ON user_companies FOR ALL USING (true);

-- Ensure primary admin user is assigned to the Admin role if they exist
DO $$
DECLARE
    admin_role_id UUID;
    target_user_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM roles WHERE name = 'Admin';
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'avessaify@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Insert or update profile
        INSERT INTO public.profiles (id, email, role, role_id, is_active)
        VALUES (target_user_id, 'avessaify@gmail.com', 'admin', admin_role_id, TRUE)
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            role_id = admin_role_id,
            is_active = TRUE;
            
        -- Grant access to all existing companies
        INSERT INTO public.user_companies (user_id, company_id)
        SELECT target_user_id, id FROM public.companies
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
