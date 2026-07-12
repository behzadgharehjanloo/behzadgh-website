# Vercel + Google Workspace Production Setup

## Gmail API provider

Email delivery uses the official `googleapis` package with an OAuth 2.0 refresh token. There is no Resend integration and no Google App Password. `lib/gmail-service.mjs` owns OAuth client creation, token refresh, Gmail message delivery, and reusable MIME construction. The existing durable Postgres outbox remains responsible for claiming, idempotency, retry backoff, terminal failure, and delivery status.

The complete production environment-variable list is:

- `DATABASE_URL`: Neon Postgres connection string.
- `ADMIN_PASSWORD_HASH`: server-only private-admin password hash.
- `AUTH_COOKIE_SECURE`: set to `true` on Vercel.
- `SITE_URL`: set to `https://behzadgh.com`.
- `EMAIL_TOKEN_SECRET`: server-only secret for confirmation and unsubscribe tokens.
- `GOOGLE_CLIENT_ID`: OAuth 2.0 Web client ID.
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Web client secret.
- `GOOGLE_REFRESH_TOKEN`: offline refresh token authorized as `still@behzadgh.com` with only `gmail.send`.
- `CRON_SECRET`: server-only authorization value for the outbox Cron route.

No email credential may use a `NEXT_PUBLIC_` prefix. The Gmail module reads credentials from the server environment only when constructing the authenticated service. It never returns or intentionally logs credentials, OAuth responses, provider error bodies, or recipient addresses.

## Do these steps in order

1. In the Vercel project, open **Settings -> Git** and record the configured **Production Branch**. Merge this work into that branch before deploying.
2. Open **Storage**, choose **Create Database**, select **Neon Postgres**, and connect it to the project for **Production**.
3. In **Settings -> Environment Variables**, confirm the Neon integration supplied `DATABASE_URL` for Production. Never put its value in Git, screenshots, chat, or browser code.
4. Add every application variable listed in Step 4 below, scoped to **Production**. Values marked secret must be entered only in Vercel's protected environment-variable form.
5. Complete the Gmail OAuth procedure in Step 3 while signed in as `still@behzadgh.com`, then add the resulting `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` to Vercel.
6. In a trusted local shell, make `DATABASE_URL` available for that shell session without committing or printing it. Run `npm run db:migrate`, followed by `npm run db:check`.
7. Run `npm test`, `npm run typecheck`, `npm run email:check-format`, and `npm run build`. These checks use test doubles and do not send real email.
8. Push or merge into the configured Vercel Production Branch and deploy that commit. Confirm the deployment includes `vercel.json` and the once-daily `/api/cron/email-outbox` job.
9. Only after the deployment and DNS/OAuth checks pass, perform the single controlled real-subscription test in Step 7 with an address you own.

## Production architecture

The production website runs as Vercel Functions. It does not run a permanent Node.js process and does not use SQLite in production.

- **Website and API:** the existing Vercel project.
- **Authoritative database:** one Neon Postgres database connected through the Vercel Marketplace. Subscriber records, consent state, admin sessions, rate limits, and the email queue all live here.
- **Immediate Welcome Email:** the subscription API creates the subscriber and a claimed outbox record in Postgres, then sends the Welcome Email synchronously through the Gmail API before returning success. If Gmail fails, the outbox record becomes queued for retry.
- **Retry processing:** Vercel Cron calls `GET /api/cron/email-outbox` once daily at 03:00 UTC. Vercel supplies `Authorization: Bearer <CRON_SECRET>`. This route is fallback infrastructure, not part of the normal initial Welcome Email path.
- **Email sender:** the Google Workspace mailbox `still@behzadgh.com`, authorized with only the `gmail.send` OAuth scope.

Vercel function instances may stop, restart, or overlap. No authoritative state is kept in memory or on their filesystem. Deployments and serverless restarts therefore do not delete subscribers or queued email. Postgres row claims and unique deduplication keys protect overlapping or duplicate Cron invocations.

The immediate Welcome Email works on standard Vercel Functions and does not require Vercel Pro. The repository uses a once-daily retry Cron compatible with Vercel Hobby. Upgrade the schedule only if faster automated retries become important.

## Services to create

1. Keep the existing Vercel project for `behzadgh.com`.
2. Add one **Neon Postgres** integration from the Vercel Marketplace and connect it to the production project.
3. Create or select one Google Cloud project owned by the `behzadgh.com` Google Workspace organization.
4. Enable the Gmail API in that Google Cloud project.

No Redis, Vercel Blob, separate VM, continuously running worker, SQLite volume, Supabase, Resend, or hosted newsletter provider is required.

## Step 1: Create and connect Neon Postgres

1. In Vercel, open the `behzadgh.com` project.
2. Open **Storage** and add **Neon Postgres** from the Marketplace.
3. Create a production database in a region close to the Vercel function region. The default Vercel Node.js region is commonly `iad1`; choose the matching or nearest Neon region.
4. Connect the database to the Vercel project for **Production**. Connect Preview and Development only if you intentionally want separate non-production databases.
5. Confirm Vercel created a server-only `DATABASE_URL` value. Do not copy it into source code.
6. From a trusted local shell, obtain the production value using Vercel's environment tooling or copy it directly into a temporary local environment without printing it in shared logs.
7. Run `npm run db:migrate` once against the production database.
8. Run `npm run db:check` and confirm the migration count is reported.
9. Enable Neon restore/history features appropriate to the plan and document a restore test.

This project starts with a new Postgres schema. The earlier local SQLite database was a development prototype and is not used by Vercel. The repository began with no real subscribers, so no production subscriber migration is expected. If real records are added to SQLite before cutover, stop and perform an explicit reviewed import rather than copying the SQLite file to Vercel.

## Step 2: Create application secrets locally

Generate these values locally. Never paste them into chat, issue trackers, source files, screenshots, or build logs.

- `ADMIN_PASSWORD_HASH`: run `npm run auth:hash-password` and keep only the resulting hash.
- `EMAIL_TOKEN_SECRET`: generate 32 cryptographically random bytes encoded as base64url. Back it up securely; rotation invalidates outstanding confirmation and unsubscribe links.
- `CRON_SECRET`: generate at least 32 random bytes. It protects the Cron endpoint.

## Step 3: Configure Google OAuth

1. In Google Cloud Console, select the organization-owned project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen as **Internal** when supported by the Workspace account.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI to that client: `https://developers.google.com/oauthplayground`.
6. Open [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), open its settings (gear icon), enable **Use your own OAuth credentials**, and enter the new client ID and client secret. Do not save either value in a shared browser profile.
7. In the scope field, enter only `https://www.googleapis.com/auth/gmail.send`, then choose **Authorize APIs**.
8. Sign in as `still@behzadgh.com`, approve that single scope, and choose **Exchange authorization code for tokens**.
9. Copy the returned refresh token directly into the Vercel Production variable `GOOGLE_REFRESH_TOKEN`. Also add the client ID and client secret to their corresponding Vercel variables. Do not paste any of these values into source files, chat, screenshots, or logs.
10. Remove the credentials from the OAuth Playground settings when finished. The application uses the refresh token only on the server; it does not need the mailbox password.

Official references:

- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/workspace/gmail/api/auth/web-server

## Step 4: Add Vercel production environment variables

Add every value below in **Vercel project → Settings → Environment Variables** and scope it to **Production**. Preview deployments should use separate non-production credentials and a separate database, or leave email delivery unconfigured.

| Variable | Secret | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string; normally created by the Vercel integration. |
| `ADMIN_PASSWORD_HASH` | Yes | Scrypt hash for the private admin password. |
| `AUTH_COOKIE_SECURE` | No | Set to `true` in production. |
| `SITE_URL` | No | Set to `https://behzadgh.com`. |
| `EMAIL_TOKEN_SECRET` | Yes | Derives opaque confirmation and unsubscribe tokens. |
| `GOOGLE_CLIENT_ID` | Treat as sensitive | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret. |
| `GOOGLE_REFRESH_TOKEN` | Yes | Offline token authorized for `still@behzadgh.com` with `gmail.send`. |
| `CRON_SECRET` | Yes | Authorizes Vercel Cron requests. Use at least 32 random bytes. |

Do not prefix any secret with `NEXT_PUBLIC_`. Server modules read these values only inside Node.js route handlers and the Cron function. The code never returns them in API responses, embeds them in rendered pages, or intentionally logs them. `.env`, `.env.local`, and `.env*.local` are ignored by Git; `.env.example` contains names and blank placeholders only.

After adding or changing production environment variables, redeploy so Vercel Functions receive the new values.

## Step 5: Verify Vercel Cron

1. Deploy the commit containing `vercel.json`.
2. In the Vercel project, open **Settings → Cron Jobs**.
3. Confirm `/api/cron/email-outbox` is scheduled with `0 3 * * *` in UTC.
4. Confirm an unauthenticated request to that route returns HTTP 401.
5. Do not place `CRON_SECRET` in a query string. Vercel supplies it in the Authorization header automatically.
6. Review Cron invocation logs. Responses contain counts only and must not contain email addresses or secrets.

Vercel does not retry failed Cron invocations. Reliability comes from the durable Postgres queue: unsent rows remain due for the next invocation, and each message receives at most eight controlled delivery attempts. Stale claims return to the queue after ten minutes.

Official references:

- https://vercel.com/docs/cron-jobs
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/marketplace/neon/neon

## Step 6: Verify DNS authentication

Inspect live DNS before changing anything. There must be one SPF record. If Google Workspace is the only legitimate sender, the normal starting policy is:

```text
v=spf1 include:_spf.google.com ~all
```

Merge other legitimate senders into the same record; never publish a second SPF record. Enable Google Workspace DKIM with a 2048-bit key and publish the selector exactly as supplied in the Admin console. Start DMARC in reporting mode with a real monitored aggregate-report address, review alignment, and move gradually to quarantine/reject only when every legitimate stream passes.

Do not remove or replace Google Workspace MX, SPF, DKIM, or verification records. Do not assume a record is obsolete solely because it names an unfamiliar selector.

## Step 7: Controlled production verification

Before public promotion:

1. Run `npm run email:check-format` locally; this builds synthetic MIME and sends nothing.
2. Subscribe one test address you control from the production `/subscribe` page.
3. Confirm the browser shows “You’re subscribed. Your welcome email is on its way.” only after the request completes.
4. Confirm the subscriber is stored once as `active` in Postgres and its initial welcome outbox row is `sent` (or `queued` if Gmail failed).
5. Confirm the Welcome Email arrives immediately without waiting for Cron and appears in the Sent folder for `still@behzadgh.com`.
6. Submit the same active address again. Confirm no second subscriber row and no second Welcome Email are created.
7. In an external Gmail mailbox, use **Show original** and verify SPF, DKIM, and DMARC all report PASS with aligned `behzadgh.com` identity.
8. Confirm From and Reply-To are `still@behzadgh.com`, the Message-ID domain is `behzadgh.com`, and both plain-text and HTML parts exist.
9. Confirm the exact supplied Welcome copy and gold/navy visual treatment are present.
10. Confirm the message contains an HTTPS `List-Unsubscribe` header and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
11. Open the unsubscribe link and confirm the page requires explicit action. Then unsubscribe and confirm the Postgres status becomes `unsubscribed`.
12. Submit that unsubscribed address again. Confirm it is not silently active and instead requires explicit confirmation.
13. For a controlled retry test, temporarily use an invalid non-production Google credential, submit a new test address, and confirm the subscriber persists while the outbox row becomes `queued`. Restore the correct credential immediately and never expose either value in logs.

Inbox placement cannot be guaranteed. Do not begin newsletter campaigns until live OAuth, DNS alignment, received-message authentication, queue persistence, and unsubscribe checks all pass.
