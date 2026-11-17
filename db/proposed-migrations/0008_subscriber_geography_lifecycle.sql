-- Apply only after 0007, in a verified target schema and one transaction.
-- No subscriber deletion, historical location archive, timer or new columns.
CREATE OR REPLACE FUNCTION erase_inactive_subscriber_geography() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status <> 'active' THEN
  NEW.signup_country := NULL;
  NEW.signup_region := NULL;
 ELSIF TG_OP = 'UPDATE' THEN
  IF OLD.status <> 'active' THEN
   NEW.signup_country := NULL;
   NEW.signup_region := NULL;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
-- statement-breakpoint
-- PostgreSQL runs same-kind triggers alphabetically: erase before 0007's guard.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='subscribers'::regclass AND tgname='subscribers_00_geography_lifecycle' AND NOT tgisinternal) THEN
  CREATE TRIGGER subscribers_00_geography_lifecycle
   BEFORE INSERT OR UPDATE OF status, signup_country, signup_region ON subscribers
   FOR EACH ROW EXECUTE FUNCTION erase_inactive_subscriber_geography();
 END IF;
END $$;
-- statement-breakpoint
-- One-time cleanup of any inactive geography; does not change status or timestamps.
UPDATE subscribers SET signup_country=NULL, signup_region=NULL
 WHERE status <> 'active' AND (signup_country IS NOT NULL OR signup_region IS NOT NULL);
