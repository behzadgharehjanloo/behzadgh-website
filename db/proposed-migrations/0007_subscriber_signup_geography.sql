-- PROPOSAL ONLY: deliberately outside db/migrations (automatic discovery).
-- Apply first ONLY to a verified disposable subscriber schema after approval.
-- Existing rows remain NULL (Unknown). No backfill and no change to consent/status.
ALTER TABLE subscribers
 ADD COLUMN IF NOT EXISTS signup_country CHAR(2),
 ADD COLUMN IF NOT EXISTS signup_region VARCHAR(6);
-- statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='subscribers'::regclass AND conname='subscribers_signup_country_shape') THEN
  ALTER TABLE subscribers ADD CONSTRAINT subscribers_signup_country_shape CHECK (signup_country IS NULL OR signup_country ~ '^[A-Z]{2}$');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='subscribers'::regclass AND conname='subscribers_signup_region_shape') THEN
  ALTER TABLE subscribers ADD CONSTRAINT subscribers_signup_region_shape CHECK (signup_region IS NULL OR
    (signup_country IS NOT NULL AND signup_region ~ '^[A-Z]{2}-[A-Z0-9]{1,3}$' AND LEFT(signup_region,2)=signup_country));
 END IF;
END $$;
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS subscribers_signup_geography_idx ON subscribers(signup_country,signup_region,created_at);
-- statement-breakpoint
-- First registration only. Cannot fill legacy NULLs or overwrite on re-subscription.
-- Permit clearing both values for an authorized privacy erasure; no historical values kept.
CREATE OR REPLACE FUNCTION protect_subscriber_signup_geography() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.signup_country,NEW.signup_region) IS DISTINCT FROM ROW(OLD.signup_country,OLD.signup_region)
    AND NOT (NEW.signup_country IS NULL AND NEW.signup_region IS NULL) THEN
   RAISE EXCEPTION 'signup_geography_is_first_registration_only';
 END IF;
 RETURN NEW;
END;
$$;
-- statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='subscribers'::regclass AND tgname='subscribers_signup_geography_guard' AND NOT tgisinternal) THEN
  CREATE TRIGGER subscribers_signup_geography_guard BEFORE UPDATE OF signup_country,signup_region ON subscribers
   FOR EACH ROW EXECUTE FUNCTION protect_subscriber_signup_geography();
 END IF;
END $$;
