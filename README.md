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

The production image uses Next.js standalone output and Node.js 22. SQLite data is stored at `/app/data/behzad.sqlite` on the persistent `newsletter-data` Docker volume.

```bash
docker compose up --build -d
```

The container runs pending database migrations before starting the website. Check readiness at `http://localhost:3000/api/health`.

For local database setup, copy `.env.example` to `.env.local`, then run:

```bash
npm run db:migrate
npm run db:check
```

### Backups

Stop writes or use SQLite's online backup API before copying the database. Back up the database file from the persistent volume to storage outside the server, retain multiple dated copies, and periodically restore one into a temporary location and run `npm run db:check` against it. Never bake the live database into an image or commit it to Git.

The database contains migration metadata and the private-admin authentication tables described below. Subscriber and email tables belong to later, separately reviewed migrations.

## Private admin

The admin dashboard is available at `/admin` and is protected by a single password. Generate a password hash locally:

```bash
npm run auth:hash-password
```

Place the resulting hash in `ADMIN_PASSWORD_HASH` in the server's uncommitted `.env` file. The plaintext password is never stored. The production cookie is Secure, HttpOnly, SameSite=Strict, and host-only; terminate TLS before the container and forward requests to port 3000. Set `AUTH_COOKIE_SECURE=false` only when testing over local HTTP.

Sessions are random, revocable tokens whose SHA-256 hashes are stored in SQLite. They expire after 12 hours. Login attempts are rate-limited and old sessions are cleaned up automatically. Changing the password hash does not automatically revoke existing sessions; delete rows from `admin_sessions` or rotate the database if immediate global sign-out is required.

## Subscribers

The public subscribe form stores normalized addresses as `pending` with consent time, source, and policy version, then queues a confirmation message. Duplicate requests receive the same generic response, suppressed addresses are never reactivated, and request throttling plus a honeypot reduce automated abuse. A subscriber becomes `active` only after explicitly confirming; that transition queues the welcome email.

Each subscriber receives a random 256-bit unsubscribe token; only its SHA-256 hash is stored. The unsubscribe page requires explicit confirmation, while the endpoint also supports the exact RFC 8058 one-click POST body for future `List-Unsubscribe-Post` headers. GET requests never change subscription state, which prevents link scanners from unsubscribing recipients.

Email is sent by a separate queue worker through the Gmail API using the narrow `gmail.send` OAuth scope and the fixed sender `still@behzadgh.com`. Failed deliveries remain queued with bounded exponential backoff and stop after eight attempts for manual review. Run `npm run email:check-format` to validate multipart MIME and required headers without sending anything.

See `GOOGLE_WORKSPACE_EMAIL_SETUP.md` for the required OAuth and DNS setup, authentication verification, and launch checklist.
