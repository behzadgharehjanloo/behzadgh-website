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

The database foundation currently contains migration metadata only. Subscriber, authentication, and email tables belong to later, separately reviewed migrations.
