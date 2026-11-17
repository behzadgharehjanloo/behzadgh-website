-- Add the fields present in the original local NoteEditor without changing
-- existing subscribers, delivery records or published Note text.
-- Only apply after reviewing production schema.
ALTER TABLE studio_notes ADD COLUMN narrator TEXT NOT NULL DEFAULT 'Behzad'
 CHECK (narrator IN ('Behzad','Steven'));
ALTER TABLE studio_notes ADD COLUMN excerpt TEXT NOT NULL DEFAULT ''
 CHECK (char_length(excerpt) <= 1000);
ALTER TABLE studio_notes ADD COLUMN image_caption TEXT NOT NULL DEFAULT ''
 CHECK (char_length(image_caption) <= 1000);
ALTER TABLE studio_notes ADD COLUMN seo_description TEXT NOT NULL DEFAULT ''
 CHECK (char_length(seo_description) <= 500);
