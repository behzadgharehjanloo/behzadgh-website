# Admin-only synthetic Notes test: Production rollout

Status: prepared for review; sending must remain disabled. Do not merge or activate automatically.

## Scope

Only `/admin/diagnostics/notes-test`, its POST API, pure serialized-email rendering/validation helpers, additive Gmail CID/single-attempt support, the dedicated audit migration, and synthetic tests. No Studio, campaign, scheduler, public Notes, Subscribe, database adapter, authentication, package/lockfile, environment or private photograph changes.

The test uses the existing approved synthetic publication text and 361-byte synthetic blue PNG. No private memoir or photograph is embedded. The CID photograph and snapshot are fingerprinted. Generic `Hi there,` is intentional; no subscriber lookup or fabricated unsubscribe token.

## Database target verification

The exact Vercel integration resource, Neon project/branch, database, role, endpoint and default schema were verified through authenticated metadata during the rollout review. Keep that private deployment checklist outside this public repository. Reverify it before migration. The intended application schema is public.

Production and Preview currently share the integration-managed database resource; do not use Preview as a disposable database.

No subscriber records were queried, and no migration was executed. Reverify mapping immediately before any approved migration. A changed project/branch/database/role/search_path or name collision is a stop condition.

## Review and disabled deployment

1. Review the exact PR diff. Feature activation requires all of `ADMIN_NOTES_TEST_EMAIL_ENABLED=1`, `VERCEL_ENV=production`, and `NODE_ENV=production`.
2. Confirm the flag is absent or not `1` in Production. Its absence was verified from Vercel metadata. Do not add it in this phase.
3. Validate local tests, TypeScript, production build and Vercel Preview build. Preview has no Admin password; do not introduce credentials or use Production's database to bypass that limitation. Authenticated Preview testing is therefore blocked by existing configuration. Preview cannot send even if the flag were accidentally set because its environment is not Production.
4. Only after explicit merge approval, merge the reviewed PR through the established workflow. This deploys a disabled feature. Do not run any migration during build or deployment.
5. Check unauthorized requests are blocked, existing Admin login works, and the private test page displays disabled controls. With the flag off, the audit table is not queried and missing migration is safe. No test email is sent by page load, preparation, status checks, or deployment.

## Dedicated migration: separate approval required

Use ONLY `db/admin-test-migrations/0001_notes_test_email.sql`. Do not run the general migration runner, which is outside this rollout.

Use the exact target above, an authenticated Neon SQL console or a direct/unpooled connection kept outside command history/logs. Recheck `current_database()`, `current_schema()`, object-name absence and target identity. Run the three migration statements as a single transaction:

```sql
BEGIN;
SET LOCAL search_path TO public;
-- Execute the exact reviewed file contents here (table, function, trigger).
COMMIT;
```

Stop and roll back the transaction on any error or unexpected pre-existing object. Do not use destructive replacement, `DROP`, `CASCADE`, or `CREATE OR REPLACE` to bypass a collision. This creates one table, one function and one trigger, with no subscriber/campaign references, data updates, table rewrites or deletes. The trigger rejects deletion, identity mutation and terminal-result changes. The migration intentionally fails on a second application rather than silently overwriting existing audit history.

Afterward, verify object definitions and an empty new table without reading subscriber data. Deployment may precede this migration safely while disabled.

## Activation: another explicit approval required

1. Review audit retention/access policy: recipient addresses are private Admin-only audit data.
2. Confirm the dedicated migration is applied and immutable history is enforced.
3. Obtain explicit approval to enable the Production-only flag and perform the required Vercel redeployment so the new value takes effect. Preserve all OAuth credentials and existing settings. No new service or dependency is needed.
4. Keep every campaign/scheduler/subscriber delivery path unchanged.
5. An authenticated Admin enters exactly one recipient privately, reviews destination/subject/snapshot, then explicitly confirms one TEST message. Enabling the flag does not itself authorize or send an email.
6. A single atomic durable claim precedes Gmail. A token-only client prevents OAuth reauthentication replay; HTTP retries are disabled. Timeout/uncertain result is Needs Review, never automatically resent. Acceptance ID proves Gmail API acceptance, not inbox delivery.
7. Inspect the actual received message manually. Do not claim Gmail/Apple Mail inbox rendering until it has been observed.

## Rollback and incidents

- Disable the flag and redeploy, or roll back application code to the pre-feature version. Leave the additive audit table/function/trigger intact to preserve records.
- Do not drop the table or run a destructive down migration. Retaining unused audit objects does not affect existing subscriber behavior.
- Disabling a flag does not cancel an already-running request in an older deployment. Wait for in-flight requests/leases to settle and review attempt status before further action. Never resend an uncertain attempt automatically.
- Requests have a 10-second OAuth preflight bound, a 20-second Gmail HTTP timeout, a 25-second outer wait, a 90-second recovery lease and a 60-second route limit. Expired pending work becomes Needs Review on an explicit status check. Audit-write loss after Gmail is uncertain and must not be treated as failure-to-send.

## Verification boundaries

The original complete local implementation passed 199 regressions (13 optional integration skips), TypeScript and builds on Node 22 and 24. Its isolated durable audit integration suite passed 11/11 and removed its disposable development schema.

This focused release deliberately excludes Studio wrappers and its database-test harness. Its committed tests use synthetic data and fake/mocked transport only; the production migration is a reviewed artifact, not an automatic test or deployment action. Vercel Preview and local clean-release results are reported with the PR. No GitHub Actions workflow or billing setting is added or changed.
