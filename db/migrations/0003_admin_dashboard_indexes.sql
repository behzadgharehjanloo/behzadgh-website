CREATE INDEX IF NOT EXISTS subscribers_created_at_desc_idx ON subscribers (created_at DESC, id DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS subscribers_lower_email_pattern_idx ON subscribers (LOWER(email) text_pattern_ops);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS email_outbox_subscriber_kind_created_idx ON email_outbox (subscriber_id, kind, created_at DESC, id DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS email_outbox_kind_status_idx ON email_outbox (kind, status);
