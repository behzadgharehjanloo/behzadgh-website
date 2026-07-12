CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'unsubscribed', 'suppressed')),
  unsubscribe_token_hash TEXT NOT NULL UNIQUE,
  consented_at INTEGER NOT NULL,
  consent_source TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  unsubscribed_at INTEGER
) STRICT;

CREATE INDEX subscribers_status_created_at_idx ON subscribers (status, created_at DESC);

CREATE TABLE subscription_attempts (
  client_key TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  blocked_until INTEGER
) STRICT;
