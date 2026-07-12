ALTER TABLE subscribers ADD COLUMN unsubscribe_nonce TEXT;
ALTER TABLE subscribers ADD COLUMN confirmation_nonce TEXT;
ALTER TABLE subscribers ADD COLUMN confirmation_token_hash TEXT;
ALTER TABLE subscribers ADD COLUMN confirmation_expires_at INTEGER;
ALTER TABLE subscribers ADD COLUMN confirmed_at INTEGER;

CREATE UNIQUE INDEX subscribers_confirmation_token_hash_idx ON subscribers (confirmation_token_hash) WHERE confirmation_token_hash IS NOT NULL;

CREATE TABLE email_outbox (
  id INTEGER PRIMARY KEY,
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirmation', 'welcome')),
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL,
  locked_at INTEGER,
  worker_id TEXT,
  last_error TEXT,
  gmail_message_id TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER
) STRICT;

CREATE INDEX email_outbox_delivery_idx ON email_outbox (status, next_attempt_at, id);
