CREATE TABLE template_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES template_bundles(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Cover', 'Content', 'Newsletter', 'Last Page')),
    department_tag TEXT,
    weight INTEGER DEFAULT 10,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE folders ADD COLUMN bundle_id UUID REFERENCES template_bundles(id);
ALTER TABLE folders ADD COLUMN owner_id UUID REFERENCES profiles(id);

ALTER TABLE pages ADD COLUMN template_id UUID REFERENCES templates(id);

-- Enable RLS
ALTER TABLE template_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access bundles" ON template_bundles FOR ALL USING (
  EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND (permissions->>'is_admin')::boolean = true)
);
CREATE POLICY "Users read active bundles" ON template_bundles FOR SELECT USING (status = 'active');

CREATE POLICY "Admins full access templates" ON templates FOR ALL USING (
  EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND (permissions->>'is_admin')::boolean = true)
);
CREATE POLICY "Users read templates" ON templates FOR SELECT USING (true);
