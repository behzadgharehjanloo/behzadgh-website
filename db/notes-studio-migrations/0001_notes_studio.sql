-- Notes Studio v1. Apply manually in a transaction only after checking the
-- exact Production target. NOT part of the existing automatic migration runner.
-- No changes to subscribers, welcome emails, or subscriber events.
CREATE TABLE studio_notes (
 id UUID PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title TEXT NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
 body TEXT NOT NULL CHECK(char_length(body) BETWEEN 1 AND 15000),
 image_alt TEXT NOT NULL DEFAULT '',
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','scheduled','published','cancelled')),
 paused BOOLEAN NOT NULL DEFAULT FALSE,
 scheduled_at TIMESTAMPTZ,
 published_at TIMESTAMPTZ,
 revision INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK(state <> 'scheduled' OR scheduled_at IS NOT NULL)
);
-- statement-breakpoint
CREATE TABLE studio_deliveries (
 id BIGSERIAL PRIMARY KEY,
 note_id UUID NOT NULL REFERENCES studio_notes(id),
 subscriber_id BIGINT NOT NULL REFERENCES subscribers(id),
 state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','sending','accepted','failed','needs_review','cancelled')),
 worker_token UUID,
 lease_until TIMESTAMPTZ,
 gmail_message_id TEXT,
 error_category TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 started_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 UNIQUE(note_id,subscriber_id)
);
-- statement-breakpoint
CREATE INDEX studio_deliveries_claim_idx ON studio_deliveries(state,id);
-- statement-breakpoint
CREATE INDEX studio_notes_due_idx ON studio_notes(state,scheduled_at);
-- statement-breakpoint
CREATE TABLE studio_test_sends (
 id UUID PRIMARY KEY,
 note_id UUID NOT NULL REFERENCES studio_notes(id),
 recipient TEXT NOT NULL CHECK(char_length(recipient) BETWEEN 3 AND 254),
 snapshot_revision INTEGER NOT NULL,
 state TEXT NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','sending','accepted','failed','needs_review')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '15 minutes',
 started_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 worker_token UUID,
 gmail_message_id TEXT,
 error_category TEXT
);
