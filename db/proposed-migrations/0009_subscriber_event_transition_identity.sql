-- Requires 0004 only; independent of geography columns. Apply in one transaction.
-- If applying the complete geography bundle, retain the 0007 -> 0008 -> 0009 order.
-- Preserve all existing event rows.
-- Event IDs identify genuine transitions. Timestamp equality is not retry identity.
DO $$ DECLARE item RECORD; BEGIN
 FOR item IN SELECT conname FROM pg_constraint
  WHERE conrelid='subscriber_events'::regclass AND contype='u'
   AND pg_get_constraintdef(oid)='UNIQUE (subscriber_id, event_type, occurred_at)'
 LOOP EXECUTE format('ALTER TABLE subscriber_events DROP CONSTRAINT %I',item.conname); END LOOP;
END $$;
-- statement-breakpoint
CREATE OR REPLACE FUNCTION record_subscriber_status_event() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE event_time BIGINT; event_kind TEXT;
BEGIN
 IF TG_OP='INSERT' AND NEW.status='active' THEN
  event_kind := 'activated'; event_time := COALESCE(NEW.confirmed_at,NEW.created_at);
 ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
  IF NEW.status='active' THEN
   event_kind := 'activated'; event_time := COALESCE(NEW.confirmed_at,NEW.updated_at);
  ELSIF OLD.status='active' AND NEW.status='unsubscribed' THEN
   event_kind := 'unsubscribed'; event_time := COALESCE(NEW.unsubscribed_at,NEW.updated_at);
  ELSIF OLD.status='active' AND NEW.status='suppressed' THEN
   event_kind := 'suppressed'; event_time := NEW.updated_at;
  END IF;
 END IF;
 IF event_kind IS NOT NULL THEN
  INSERT INTO subscriber_events(subscriber_id,event_type,occurred_at) VALUES(NEW.id,event_kind,event_time);
 END IF;
 RETURN NEW;
END;
$$;
