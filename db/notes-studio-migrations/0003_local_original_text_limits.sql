-- Bring the current private editor limits in line with the tested local draft UX.
-- This migration only relaxes validation of the Notes Studio table.
-- No subscriber, outbox, delivery or note rows are mutated.
ALTER TABLE studio_notes DROP CONSTRAINT studio_notes_body_check;
ALTER TABLE studio_notes ADD CONSTRAINT studio_notes_body_check
 CHECK (char_length(body) BETWEEN 1 AND 100000);
-- statement-breakpoint
ALTER TABLE studio_notes DROP CONSTRAINT studio_notes_title_check;
ALTER TABLE studio_notes ADD CONSTRAINT studio_notes_title_check
 CHECK (char_length(title) BETWEEN 1 AND 200);
-- statement-breakpoint
ALTER TABLE studio_notes ADD CONSTRAINT studio_notes_image_alt_check
 CHECK (char_length(image_alt) <= 500);
