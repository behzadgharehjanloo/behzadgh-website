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

The public subscribe form stores normalized addresses as `pending` with consent time, source, and policy version, then queues a confirmation message. Duplicate requests receive the same generic response, suppressed addresses are never reactivated, and request throttling plus a honeypot reduce automated abuse. A subscriber becomes `active` only after explicitly confirming; that transition queues the welcome email.

Each subscriber receives a random 256-bit unsubscribe token; only its SHA-256 hash is stored. The unsubscribe page requires explicit confirmation, while the endpoint also supports the exact RFC 8058 one-click POST body for future `List-Unsubscribe-Post` headers. GET requests never change subscription state, which prevents link scanners from unsubscribing recipients.

Email is processed by a `CRON_SECRET`-protected Vercel Cron route through the Gmail API using the narrow `gmail.send` OAuth scope and the fixed sender `still@behzadgh.com`. It runs for a bounded invocation and does not require a continuously running process. Failed deliveries remain in Postgres with bounded exponential backoff and stop after eight attempts for manual review. Run `npm run email:check-format` to validate multipart MIME and required headers without sending anything.

See `GOOGLE_WORKSPACE_EMAIL_SETUP.md` for the required OAuth and DNS setup, authentication verification, and launch checklist.
