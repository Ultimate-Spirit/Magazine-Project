-- This migration drops the old activity_logs table and recreates it with the new requested schema for the global activity/audit log

DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXPORT')),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert/select for public so the Vercel API routes and frontend can access it.
-- In a real production system, you would lock this down based on auth.uid() or service_role.
CREATE POLICY "Enable read access for all users" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON activity_logs FOR INSERT WITH CHECK (true);
