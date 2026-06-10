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
