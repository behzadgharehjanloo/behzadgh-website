# Notes Studio v1 — operational safety and activation

## Current state
- This PR adds the authenticated Notes Studio editor, original-text drafts with revision checks, private HTML email preview, one-recipient real-Note TEST flow, scheduling, cancellation, pause, published archive reading, and audited subscriber delivery.
- This feature is OFF by default. No existing subscriber, Welcome, confirmation, unsubscribe, or legacy email-outbox behavior is changed.
- The Studio email renderer currently sends **text-only Notes**. An image-alt field is reserved but actual photo upload, CID attachment and image moderation are not integrated. Do not claim photo email support.
- There is **no approved authentic Note content** seeded, imported or published by this change. Never substitute the synthetic test fixture or invent memoir text.

## Database migration
- Apply only `db/notes-studio-migrations/0001_notes_studio.sql` in a transaction against VERIFIED `behzadgh-production` project and its correct Production branch and database.
- Before the migration: verify `current_database()`, current schema `public`, check that `studio_notes`, `studio_deliveries` and `studio_test_sends` are absent. Do not run the generic migration runner.
- The migration only creates new tables/indexes. It does not update or delete existing subscriber data. If any object already exists or schema does not match, STOP and inspect; do not DROP or use CASCADE.
- The feature flag must remain OFF until the migration and read-only postflight checks succeed.

## Two independent controls
- `NOTES_STUDIO_ENABLED=1`: opt into the private editor, previews and direct one-recipient test flow only. Requires Production Vercel environment and NODE_ENV production.
- `NOTES_STUDIO_DELIVERY_ENABLED=1`: independently unlocks campaign publication and subscriber sends; requires the Studio flag as well.
- All real subscriber sending stays OFF until the campaign scheduling/throughput, unsubscribe handling, Gmail retry ambiguities and recipient privacy tests are reviewed. A Studio activation must NOT enable this flag.
- Test sending requires two explicit actions: prepare an exact recipient and confirm that specific test; Gmail API acceptance does not prove inbox delivery.
- Never set either flag in Preview. Do not put database or Gmail secrets in commits.

## Scheduling and throughput limitations — block public-delivery activation
- The Vercel Cron currently runs **once a day at 03:00 UTC**, not at the exact scheduled minute. There is also a protected manual 2-recipient batch action. Scheduled publication becomes due at or after the chosen time.
- Each Cron invocation sends **at most two recipient messages** serially. That is acceptable for guarded proof-of-concept testing only; it is NOT suitable for 50–200 subscribers and a simultaneous biweekly release. Implement and load-test a scalable, frequently triggered bounded worker before enabling public delivery.
- Duplicate rows are prevented by `UNIQUE(note_id,subscriber_id)` plus atomic database claim. Uncertain Gmail outcomes are marked `needs_review` and never auto-retried. This avoids potentially duplicate emails but may require a human decision about whether a recipient got the message.
- A subscriber whose status is not active at the point of send is skipped. Unsubscribe links are generated for each active subscriber; the one-click mail header points at the POST API route.
- Pausing a published Note prevents new claims; an already in-flight Gmail API request cannot necessarily be recalled.

## Release sequence
1. Confirm CI `npm test`, `npm run typecheck` and Preview build, inspect all PR changes.
2. Merge code with both feature flags absent. Confirm the original site works.
3. Apply and inspect the dedicated additive migration on the correctly verified Production DB.
4. Enable only `NOTES_STUDIO_ENABLED=1` and redeploy. Verify Admin login, draft saving, revision conflict, preview, and one-recipient TEST with an address deliberately chosen by Admin. Verify its Gmail receipt manually.
5. Improve scheduler/throughput and test large audience/uncertain outcomes, then separately authorize `NOTES_STUDIO_DELIVERY_ENABLED=1`. Do not activate until release is safe for expected audience.
6. Write/approve an authentic Note before scheduling anything. No automatic import of private memoir files.

## Rollback
Disable the two flags and redeploy. This stops future claims; in-flight Gmail calls may still finish. Do not drop Studio tables or delete audit history as a quick rollback.
