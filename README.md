# behzadgh.com

A quiet personal website for Behzad Gharehjanloo, built with Next.js App Router, TypeScript, and Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Self-hosting

The production architecture is Vercel Functions plus Neon Postgres. The optional production image uses Next.js standalone output and Node.js 22, but it connects to the same external Postgres database and does not store authoritative data inside the container.

```bash
docker compose up --build -d
```

The container runs pending Postgres migrations before starting the website. Check readiness at `http://localhost:3000/api/health`.

For local database setup, copy `.env.example` to `.env.local`, then run:

```bash
npm run db:migrate
npm run db:check
```

### Backups

Enable Neon point-in-time restore or scheduled logical backups appropriate to the selected plan. Periodically test a restore into an isolated database. The production database URL must never be baked into an image or committed to Git.

The database contains migration metadata, private-admin authentication, subscribers, consent state, and the durable email outbox.

## Private admin

The admin dashboard is available at `/admin` and is protected by a single password. Generate a password hash locally:

```bash
npm run auth:hash-password
```

Place the resulting hash in `ADMIN_PASSWORD_HASH` in the server's uncommitted `.env` file. The plaintext password is never stored. The production cookie is Secure, HttpOnly, SameSite=Strict, and host-only; terminate TLS before the container and forward requests to port 3000. Set `AUTH_COOKIE_SECURE=false` only when testing over local HTTP.

Sessions are random, revocable tokens whose SHA-256 hashes are stored in Postgres. They expire after 12 hours. Login attempts are rate-limited and old sessions are cleaned up automatically. Changing the password hash does not automatically revoke existing sessions; delete rows from `admin_sessions` if immediate global sign-out is required.

## Subscribers

The public subscribe form normalizes the address and creates a unique `active` subscriber with consent time, source, and policy version. It then sends the Welcome Email synchronously through the Gmail API. A duplicate active address does not receive another Welcome Email. A previously unsubscribed address is moved only to `pending` and must explicitly reconfirm before reactivation.

Each subscriber receives a random 256-bit unsubscribe token; only its SHA-256 hash is stored. The unsubscribe page requires explicit confirmation, while the endpoint also supports the exact RFC 8058 one-click POST body for future `List-Unsubscribe-Post` headers. GET requests never change subscription state, which prevents link scanners from unsubscribing recipients.

The initial Welcome Email does not depend on Cron. The subscription request reserves an outbox record, attempts immediate Gmail API delivery, and marks it sent. If Gmail delivery fails, the same record is released to the durable retry queue without exposing the failure. The `CRON_SECRET`-protected daily Vercel Cron route remains only for retries and future scheduled mail, so a Vercel Pro plan is not required for immediate Welcome Emails. Run `npm run email:check-format` to validate multipart MIME and required headers without sending anything.

See `GOOGLE_WORKSPACE_EMAIL_SETUP.md` for the required OAuth and DNS setup, authentication verification, and launch checklist.
