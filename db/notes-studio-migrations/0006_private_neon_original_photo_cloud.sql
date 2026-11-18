-- Additive compatibility with existing 3 MiB BYTEA photos and immutable note history.
-- Empty cloud metadata on historical images remains valid and unchanged.
ALTER TABLE studio_note_images ALTER COLUMN bytes DROP NOT NULL;
-- statement-breakpoint
ALTER TABLE studio_note_images DROP CONSTRAINT studio_note_images_bytes_check;
-- statement-breakpoint
ALTER TABLE studio_note_images ADD COLUMN storage_key TEXT, ADD COLUMN original_size INTEGER;
-- statement-breakpoint
ALTER TABLE studio_note_images ADD CONSTRAINT studio_note_images_storage_mode CHECK (
 (bytes IS NOT NULL AND octet_length(bytes) BETWEEN 1 AND 3145728 AND storage_key IS NULL AND original_size IS NULL)
 OR (bytes IS NULL AND storage_key ~ '^originals/[a-f0-9-]{36}/original$' AND original_size BETWEEN 1 AND 10000000)
);
-- statement-breakpoint
CREATE TABLE studio_cloud_photo_uploads (
 id UUID PRIMARY KEY,
 note_id UUID NOT NULL REFERENCES studio_notes(id) ON DELETE RESTRICT,
 expected_revision INTEGER NOT NULL CHECK(expected_revision>=1),
 quarantine_key TEXT UNIQUE NOT NULL CHECK(quarantine_key ~ '^quarantine/[a-f0-9-]{36}/upload$'),
 file_size INTEGER NOT NULL CHECK(file_size BETWEEN 1 AND 10000000),
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png')),
 sha256 TEXT NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 state TEXT NOT NULL DEFAULT 'uploading' CHECK(state IN ('uploading','attached','failed')),
 photo_id UUID UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '10 minutes'
);
-- statement-breakpoint
CREATE INDEX studio_cloud_photo_uploads_active_idx ON studio_cloud_photo_uploads(state,expires_at);
