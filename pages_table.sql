-- Create pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folderId UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view pages of their folder" ON pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM folders
            JOIN profiles ON profiles.company_id = folders.company_id OR profiles.role = 'admin'
            WHERE folders.id = pages.folderId
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY "Admins and Editors can insert pages" ON pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM folders
            JOIN profiles ON profiles.company_id = folders.company_id OR profiles.role = 'admin'
            WHERE folders.id = pages.folderId
            AND profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins and Editors can update pages" ON pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM folders
            JOIN profiles ON profiles.company_id = folders.company_id OR profiles.role = 'admin'
            WHERE folders.id = pages.folderId
            AND profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins and Editors can delete pages" ON pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM folders
            JOIN profiles ON profiles.company_id = folders.company_id OR profiles.role = 'admin'
            WHERE folders.id = pages.folderId
            AND profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );
