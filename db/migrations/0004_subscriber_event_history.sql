CREATE TABLE IF NOT EXISTS subscriber_events (
  id BIGSERIAL PRIMARY KEY,
  subscriber_id BIGINT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('activated', 'unsubscribed', 'suppressed')),
  occurred_at BIGINT NOT NULL,
  recorded_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
  UNIQUE (subscriber_id, event_type, occurred_at)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS subscriber_events_occurred_at_idx ON subscriber_events (occurred_at, event_type);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS subscriber_events_subscriber_occurred_idx ON subscriber_events (subscriber_id, occurred_at DESC, id DESC);
-- statement-breakpoint
INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
SELECT id, 'activated', COALESCE(confirmed_at, created_at)
FROM subscribers
WHERE status IN ('active', 'unsubscribed')
ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
-- statement-breakpoint
INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
SELECT id, 'unsubscribed', unsubscribed_at
FROM subscribers
WHERE status = 'unsubscribed' AND unsubscribed_at IS NOT NULL
ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
-- statement-breakpoint
CREATE OR REPLACE FUNCTION record_subscriber_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  event_time BIGINT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    event_time := COALESCE(NEW.confirmed_at, NEW.created_at);
    INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
    VALUES (NEW.id, 'activated', event_time)
    ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'active' THEN
      event_time := COALESCE(NEW.confirmed_at, NEW.updated_at);
      INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
      VALUES (NEW.id, 'activated', event_time)
      ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
    ELSIF OLD.status = 'active' AND NEW.status = 'unsubscribed' THEN
      event_time := COALESCE(NEW.unsubscribed_at, NEW.updated_at);
      INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
      VALUES (NEW.id, 'unsubscribed', event_time)
      ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
    ELSIF OLD.status = 'active' AND NEW.status = 'suppressed' THEN
      event_time := NEW.updated_at;
      INSERT INTO subscriber_events (subscriber_id, event_type, occurred_at)
      VALUES (NEW.id, 'suppressed', event_time)
      ON CONFLICT (subscriber_id, event_type, occurred_at) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
-- statement-breakpoint
DROP TRIGGER IF EXISTS subscribers_status_event_trigger ON subscribers;
-- statement-breakpoint
CREATE TRIGGER subscribers_status_event_trigger
AFTER INSERT OR UPDATE OF status ON subscribers
FOR EACH ROW EXECUTE FUNCTION record_subscriber_status_event();
