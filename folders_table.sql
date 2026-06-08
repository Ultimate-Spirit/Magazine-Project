-- Create folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view folders of their company" ON folders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.company_id = folders.company_id)
        )
    );

CREATE POLICY "Admins and Editors can insert folders" ON folders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role IN ('admin', 'editor'))
            AND (profiles.role = 'admin' OR profiles.company_id = folders.company_id)
        )
    );

CREATE POLICY "Admins and Editors can update folders" ON folders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role IN ('admin', 'editor'))
            AND (profiles.role = 'admin' OR profiles.company_id = folders.company_id)
        )
    );

CREATE POLICY "Admins and Editors can delete folders" ON folders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role IN ('admin', 'editor'))
            AND (profiles.role = 'admin' OR profiles.company_id = folders.company_id)
        )
    );
