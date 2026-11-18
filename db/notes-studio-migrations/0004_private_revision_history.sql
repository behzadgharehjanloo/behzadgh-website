-- Isolated append-only snapshots of *successful* private Note saves.
-- No edits to subscriber, email, campaign or public-note records.
-- Existing Notes receive ONLY their currently saved revision as a baseline;
-- earlier historical revisions cannot be invented or recovered.
CREATE TABLE IF NOT EXISTS studio_note_revisions (
 note_id UUID NOT NULL REFERENCES studio_notes(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK (revision >= 1),
 slug TEXT NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 narrator TEXT NOT NULL CHECK (narrator IN ('Behzad','Steven')),
 image_alt TEXT NOT NULL DEFAULT '',
 excerpt TEXT NOT NULL DEFAULT '',
 image_caption TEXT NOT NULL DEFAULT '',
 seo_description TEXT NOT NULL DEFAULT '',
 saved_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(note_id,revision)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS studio_note_revisions_recent_idx ON studio_note_revisions(note_id,saved_at DESC,revision DESC);
-- statement-breakpoint
INSERT INTO studio_note_revisions(note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at)
 SELECT id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,updated_at
 FROM studio_notes
 ON CONFLICT (note_id,revision) DO NOTHING;
-- statement-breakpoint
CREATE FUNCTION reject_studio_note_revision_changes() RETURNS TRIGGER LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'Historical Note revisions are immutable'; END
$$;
-- statement-breakpoint
CREATE TRIGGER studio_note_revisions_immutable
 BEFORE UPDATE OR DELETE ON studio_note_revisions
 FOR EACH ROW EXECUTE FUNCTION reject_studio_note_revision_changes();
