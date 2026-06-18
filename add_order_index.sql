-- Migration: Add order_index to pages table
-- This allows the dnd-kit drag-and-drop feature to persist sorting order for the Master PDF compilation.

ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Optional: Initialize existing pages with an arbitrary sequential order based on creation time to prevent all being 0
WITH numbered_pages AS (
  SELECT id, ROW_NUMBER() OVER(PARTITION BY folder_id ORDER BY created_at ASC) as rn
  FROM pages
)
UPDATE pages
SET order_index = numbered_pages.rn
FROM numbered_pages
WHERE pages.id = numbered_pages.id;
