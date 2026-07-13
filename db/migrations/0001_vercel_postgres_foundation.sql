CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  last_seen_at BIGINT NOT NULL
);
-- statement-breakpoint
CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);
-- statement-breakpoint
CREATE TABLE admin_login_attempts (
  client_key TEXT PRIMARY KEY,
  window_started_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL,
  blocked_until BIGINT
);
-- statement-breakpoint
CREATE TABLE subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'unsubscribed', 'suppressed')),
  unsubscribe_token_hash TEXT NOT NULL UNIQUE,
  consented_at BIGINT NOT NULL,
  consent_source TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  unsubscribed_at BIGINT,
  unsubscribe_nonce TEXT,
  confirmation_nonce TEXT,
  confirmation_token_hash TEXT UNIQUE,
  confirmation_expires_at BIGINT,
  confirmed_at BIGINT
);
-- statement-breakpoint
CREATE INDEX subscribers_status_created_at_idx ON subscribers (status, created_at DESC);
-- statement-breakpoint
CREATE TABLE subscription_attempts (
  client_key TEXT PRIMARY KEY,
  window_started_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL,
  blocked_until BIGINT
);
-- statement-breakpoint
CREATE TABLE email_outbox (
  id BIGSERIAL PRIMARY KEY,
  subscriber_id BIGINT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('confirmation', 'welcome')),
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at BIGINT NOT NULL,
  locked_at BIGINT,
  worker_id TEXT,
  last_error TEXT,
  gmail_message_id TEXT,
  created_at BIGINT NOT NULL,
  sent_at BIGINT
);
-- statement-breakpoint
CREATE INDEX email_outbox_delivery_idx ON email_outbox (status, next_attempt_at, id);
