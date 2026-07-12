# Google Workspace Email Setup

The application sends only through the Gmail API as `still@behzadgh.com`. It requests the narrow `https://www.googleapis.com/auth/gmail.send` OAuth scope. Do not store the mailbox password, use direct-to-MX delivery, or substitute an unrelated sender.

## 1. Google Cloud and Workspace authorization

1. Create or select a Google Cloud project owned by the same organization as `behzadgh.com`.
2. Enable the Gmail API.
3. Configure the OAuth consent screen for internal use if the Workspace edition permits it.
4. Create an OAuth client and authorize `still@behzadgh.com` for only `https://www.googleapis.com/auth/gmail.send`.
5. Obtain an offline refresh token and store the client ID, client secret, and refresh token only in the server's uncommitted `.env` file.
6. Never put OAuth credentials in Git, Docker images, browser code, logs, support messages, or screenshots.

Required values:

```text
SITE_URL=https://behzadgh.com
EMAIL_TOKEN_SECRET=<32 random bytes encoded as base64url>
GOOGLE_CLIENT_ID=<OAuth client id>
GOOGLE_CLIENT_SECRET=<OAuth client secret>
GOOGLE_REFRESH_TOKEN=<offline refresh token for still@behzadgh.com>
```

Generate `EMAIL_TOKEN_SECRET` once and back it up securely. Changing it invalidates outstanding confirmation and unsubscribe links.

Official references:

- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/workspace/gmail/api/auth/web-server

## 2. DNS authentication

Inspect live DNS before changing anything. There must be one SPF record. If Google Workspace is the only legitimate sender, the normal starting policy is:

```text
v=spf1 include:_spf.google.com ~all
```

Merge other legitimate senders into the same record; never publish a second SPF record. Enable Google Workspace DKIM with a 2048-bit key and publish the selector exactly as supplied in the Admin console. Start DMARC in reporting mode with a real monitored aggregate-report address, review alignment, and move gradually to quarantine/reject only when every legitimate stream passes.

Do not remove or replace Google Workspace MX, SPF, DKIM, or verification records. Do not assume a record is obsolete solely because it names an unfamiliar selector.

## 3. Runtime checks

Before starting the worker:

```bash
npm run db:migrate
npm run email:check-format
docker compose up --build -d
```

The `email-worker` processes at most ten queued messages per pass, sleeps for 15 seconds, and retries temporary failures with bounded exponential backoff. Pending subscribers are never eligible for welcome or campaign mail. Unsubscribed and suppressed subscribers cancel queued messages before delivery.

## 4. Authentication and deliverability verification

Send only to test addresses you control until every check passes:

- Confirm the message appears in the Sent folder for `still@behzadgh.com`.
- In an external Gmail mailbox, use “Show original” and confirm SPF, DKIM, and DMARC all report PASS with aligned `behzadgh.com` identity.
- Confirm From and Reply-To are `still@behzadgh.com` and the Message-ID domain is `behzadgh.com`.
- Confirm both `text/plain` and `text/html` parts exist.
- Confirm the welcome message includes `List-Unsubscribe` with an HTTPS URL and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.
- Confirm a GET to the unsubscribe URL does not change state, while the one-click POST immediately suppresses future newsletter delivery.
- Confirm confirmation links expire after seven days and require explicit browser confirmation.
- Confirm the welcome email is sent only after activation and only once.
- Confirm the worker retains failures without logging recipient addresses or OAuth credentials.
- Start with very low volume, send only to explicitly confirmed recipients, and monitor bounces, spam complaints, DMARC reports, and Google Postmaster Tools as volume grows.

Inbox placement cannot be guaranteed. Do not begin newsletter campaigns until these checks pass with live DNS and real received messages.
