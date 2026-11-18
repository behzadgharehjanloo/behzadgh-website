-- Original Local Studio's private 3 MiB BYTEA photo mode, isolated from
-- subscribers, public reading and campaign delivery.
CREATE TABLE studio_note_images (
 id UUID PRIMARY KEY,
 note_id UUID NOT NULL REFERENCES studio_notes(id) ON DELETE RESTRICT,
 mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
 bytes BYTEA NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 3145728),
 sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
 width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 8192),
 height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 8192),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (note_id,id),
 CHECK (width::bigint * height <= 16000000)
);
-- statement-breakpoint
ALTER TABLE studio_notes ADD COLUMN photo_id UUID;
-- statement-breakpoint
ALTER TABLE studio_notes ADD COLUMN photo_framing JSONB;
-- statement-breakpoint
ALTER TABLE studio_notes ADD CONSTRAINT studio_note_photo_fk
 FOREIGN KEY (id,photo_id) REFERENCES studio_note_images(note_id,id)
 DEFERRABLE INITIALLY DEFERRED;
-- statement-breakpoint
ALTER TABLE studio_note_revisions ADD COLUMN photo_id UUID;
-- statement-breakpoint
ALTER TABLE studio_note_revisions ADD COLUMN photo_framing JSONB;
-- statement-breakpoint
ALTER TABLE studio_note_revisions ADD CONSTRAINT studio_revision_photo_fk
 FOREIGN KEY (note_id,photo_id) REFERENCES studio_note_images(note_id,id);
-- statement-breakpoint
CREATE FUNCTION reject_studio_photo_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
 BEGIN RAISE EXCEPTION 'Saved photograph bytes are immutable'; END
$$;
-- statement-breakpoint
CREATE TRIGGER studio_note_image_immutable BEFORE UPDATE OR DELETE ON studio_note_images
 FOR EACH ROW EXECUTE FUNCTION reject_studio_photo_mutation();
