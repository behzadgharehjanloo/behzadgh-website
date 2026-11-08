-- Separate from the general migration runner. No subscriber/Studio dependencies.
CREATE TABLE admin_notes_test_sends (
 id UUID PRIMARY KEY, recipient TEXT NOT NULL CHECK(char_length(recipient) BETWEEN 3 AND 254),
 snapshot_id TEXT NOT NULL CHECK(snapshot_id ~ '^[a-f0-9]{64}$'),
 image_sha256 TEXT NOT NULL CHECK(image_sha256 ~ '^[a-f0-9]{64}$'), subject TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','sending','accepted','failed','needs_review')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '15 minutes',
 started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, lease_until TIMESTAMPTZ, worker_token UUID,
 gmail_message_id TEXT CHECK(gmail_message_id IS NULL OR gmail_message_id ~ '^[A-Za-z0-9_-]{1,120}$'),
 error_category TEXT CHECK(error_category IS NULL OR error_category IN ('known_rejection','ambiguous','lease_expired'))
);
-- statement-breakpoint
CREATE FUNCTION guard_admin_notes_test_send() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'admin_test_history_immutable'; END IF;
 IF ROW(NEW.id,NEW.recipient,NEW.snapshot_id,NEW.image_sha256,NEW.subject,NEW.created_at,NEW.expires_at)
 IS DISTINCT FROM ROW(OLD.id,OLD.recipient,OLD.snapshot_id,OLD.image_sha256,OLD.subject,OLD.created_at,OLD.expires_at)
 OR (OLD.state IN ('accepted','failed','needs_review') AND NEW IS DISTINCT FROM OLD)
 OR (OLD.state='prepared' AND NEW.state<>'sending')
 OR (OLD.state='sending' AND NEW.state NOT IN ('accepted','failed','needs_review'))
 THEN RAISE EXCEPTION 'admin_test_history_immutable'; END IF;
 RETURN NEW;
END; $$;
-- statement-breakpoint
CREATE TRIGGER admin_notes_test_send_guard BEFORE UPDATE OR DELETE ON admin_notes_test_sends FOR EACH ROW EXECUTE FUNCTION guard_admin_notes_test_send();
