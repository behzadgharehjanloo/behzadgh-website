# Newsletter Cleanup Report

## Audit baseline

- Starting branch: `main`
- Starting Git status: clean
- Cleanup branch: `cleanup/remove-hosted-newsletter-services`
- Audit date: 2026-07-12
- Scope searched: source, configuration, documentation, package manifest, npm lockfile, routes, environment-variable references, and ignored-file patterns.

## A. Current subscription entry points

| File | Component | Pages | Submit handler / API route | Provider | Success and error behavior |
| --- | --- | --- | --- | --- | --- |
| `app/subscribe/page.tsx` | `SubscribePage` | `/subscribe` (linked from the header and home page) | None | None | No success or error state. The email input and button are disabled, no form action exists, and the inline message says “Subscriptions are opening soon.” No address is transmitted, logged, or stored. |

There are no other subscribe forms or subscription entry points. The shared behavior is therefore defined once on the only subscription page.

## B. Provider integration inventory

No Kit, ConvertKit, or Loops integration was found. Specifically, the repository contains no provider package, import, API endpoint, route handler, webhook, utility, type, test, template dependency, environment-variable reference, or provider documentation. There is consequently no provider code or package that is safe or necessary to remove.

The isolated string `kit` inside one `package-lock.json` integrity checksum is generated package metadata, not an integration or dependency.

## C. Welcome email inventory

No welcome-email template or sending implementation exists in the repository. Subject, sender, reply-to, HTML, plain text, styles, images, fonts, links, privacy statement, signature, and unsubscribe behavior are therefore not locally available to preserve. If a welcome email exists in an external provider account, it cannot be inventoried from this repository and should be exported manually before that account is retired.

Future welcome mail should use `still@behzadgh.com` in the visible From and Reply-To fields, contain both plain-text and lightweight HTML alternatives, identify why the recipient is receiving it, and contain an immediately usable unsubscribe link.

## D. DNS and external configuration references

No DNS records, sending-provider records, tracking domains, verification records, Vercel provider settings, or Google Workspace configuration are documented in this repository. No DNS or external configuration was changed.

Before any future sending launch, inventory the live DNS separately and distinguish Google Workspace records from obsolete newsletter-provider records. Do not remove Google Workspace MX, SPF, DKIM, or verification records. Any provider-specific DKIM CNAME/TXT records, tracking CNAMEs, or verification TXT records should only be considered for manual removal after ownership and active use are confirmed.

## EMAIL DELIVERABILITY DESIGN

Inbox placement cannot be guaranteed. The future system should optimize placement while protecting the established Google Workspace and `behzadgh.com` reputation.

### Sending architecture

- Send through the authenticated Google Workspace account `still@behzadgh.com`; do not use unauthenticated direct-to-MX delivery or a mismatched envelope sender.
- Use OAuth 2.0 where practical. If SMTP is used, use Google’s authenticated TLS submission service and keep credentials only in server-side secrets.
- Keep the visible From domain, authenticated DKIM domain, and DMARC organizational domain aligned. Use `still@behzadgh.com` as From and Reply-To.
- Treat Google Workspace sending limits as hard ceilings, not throughput targets. Add a queue, conservative rate limiting, retry with exponential backoff, and suppression of permanent failures. Never retry hard bounces indefinitely.
- Begin with very small, explicitly opted-in sends and grow volume gradually. Do not purchase, import, scrape, or pre-check consent for addresses.
- Separate transactional contact-form delivery from newsletter campaigns in application queues and logs, while keeping authentication aligned.

### SPF, DKIM, and DMARC

The exact live records must be inspected before changes because DNS is external to this repository.

- **SPF:** publish exactly one SPF TXT policy at the root. For a domain whose only sender is Google Workspace, the normal basis is `v=spf1 include:_spf.google.com ~all`. Merge any other legitimate senders into that single record; never publish multiple SPF records. Move to `-all` only after every legitimate source is confirmed.
- **DKIM:** enable Google Workspace DKIM with a 2048-bit key in the Admin console and publish the selector record Google supplies (commonly a selector such as `google._domainkey`). Verify signatures pass before newsletter sending begins. Rotate keys deliberately and retain the old record during propagation when applicable.
- **DMARC:** start with an aligned reporting policy such as `v=DMARC1; p=none; rua=mailto:<dedicated-dmarc-report-address>; adkim=r; aspf=r; pct=100`. Use a real, monitored report mailbox or reporting service—not a placeholder. Review reports, then progress to `p=quarantine` and eventually `p=reject` only after all legitimate mail streams consistently pass and align. Do not change policy blindly.
- SPF authorizes infrastructure; DKIM signs messages; DMARC evaluates aligned authentication. All three must be verified from a message received outside the domain (for example, by inspecting Gmail “Show original”) before launch.

### Message and header requirements

Every future message must:

- be a standards-compliant `multipart/alternative` message with a meaningful UTF-8 `text/plain` part followed by a lightweight UTF-8 `text/html` part;
- include valid `Date`, globally unique `Message-ID`, `From`, `To`, `Subject`, `MIME-Version`, and appropriate `Content-Type` / transfer-encoding headers;
- avoid user-supplied header values or strip CR/LF to prevent header injection;
- include `List-Unsubscribe: <https://behzadgh.com/...>, <mailto:...>` for newsletter mail when both methods are operational;
- include `List-Unsubscribe-Post: List-Unsubscribe=One-Click` when the HTTPS endpoint implements RFC 8058 one-click POST semantics without requiring login or a confirmation page;
- use a signed, opaque, expiring-or-revocable unsubscribe token that exposes neither the email address nor a predictable subscriber ID;
- avoid misleading subjects, excessive punctuation/capitalization, URL shorteners, hidden text, attachment-heavy content, image-only layouts, and unnecessary tracking redirects;
- keep HTML simple, responsive, accessible, and mostly single-column, with inline-safe styles, real text, descriptive links, dimensions on images, and no scripts, forms, video, or remote web fonts;
- include the sender identity, a concise reason the recipient is receiving the message, and a visible unsubscribe link in both alternatives.

### Welcome email best practices

- Trigger only after explicit subscription; consider confirmed opt-in before activating the subscriber.
- Send promptly, set expectations for topic and frequency, and make the sender recognizable.
- Keep the first message short and useful; avoid a large promotional image, multiple calls to action, attachments, or tracking-heavy links.
- Include the same authentication, multipart, identity, and unsubscribe protections as a campaign.
- Do not request replies unless the mailbox is monitored. Because `still@behzadgh.com` is the Reply-To address, replies must be handled normally.

## SELF-HOSTING READINESS

> **Architecture update (2026-07-12):** The production target was later confirmed as Vercel. The Docker/SQLite readiness notes below are historical audit findings, not the current production design. Production now uses Vercel Functions, secured Vercel Cron, and Neon Postgres as documented in `GOOGLE_WORKSPACE_EMAIL_SETUP.md`.

- Next.js: declared as `^15.3.0`; the verified installed version is 15.5.19.
- React / React DOM: declared as `^19.0.0`.
- Routing: App Router (`app/` directory); no Pages Router.
- Language and styling: TypeScript and Tailwind CSS.
- Package manager: npm (`package-lock.json`).
- Node.js: no project version is pinned. A supported LTS version should be pinned before containerization; Node type declarations are `^22.15.0`.
- Vercel-specific dependencies or APIs: none found.
- Vercel Analytics: none found.
- Edge Runtime declarations: none found.
- Middleware: none found.
- Cron jobs: none found.
- File-system assumptions: none found in application code. The future SQLite file must live on a mounted persistent volume and never in an ephemeral image layer.
- Image behavior: no `next/image` usage or remote image configuration found.
- Standalone output: suitable in principle; `output: "standalone"` is not currently configured and should be validated when Docker support is added.
- Docker: a multi-stage build is appropriate to keep the runtime image small and exclude build-only dependencies. Docker, SQLite, authentication, and email sending are intentionally not implemented in this task.

## Environment variables

No provider-specific variable references or example variables exist in source, documentation, tests, or templates. No real `.env` file was read or edited. There are no identified Kit, ConvertKit, or Loops variable names to remove from code or manually from Vercel. The Vercel environment should still be reviewed manually for legacy variables whose names are not represented in this repository, without displaying their values.

## Deliverability launch checklist

The newsletter system is not complete until all applicable items pass:

- [ ] Subscription consent, timestamp, source, and policy version are stored; confirmed opt-in is enabled if chosen.
- [ ] `still@behzadgh.com` is an active, monitored Google Workspace mailbox and is the authenticated sender.
- [ ] A received external test shows SPF = PASS, DKIM = PASS, DMARC = PASS, with domain alignment.
- [ ] There is one valid SPF record; Google DKIM uses a 2048-bit key; DMARC reports are monitored.
- [ ] DMARC enforcement is increased only after reports show all legitimate streams aligned.
- [ ] Every message has working plain-text and HTML alternatives and standards-compliant headers.
- [ ] Visible unsubscribe works without login; one-click unsubscribe headers and POST behavior pass when implemented.
- [ ] Unsubscribes take effect immediately and the suppression list is checked before every send.
- [ ] Hard bounces and repeated soft bounces are suppressed; complaints are investigated immediately.
- [ ] Sending is queued, rate-limited, idempotent, and protected against duplicate campaigns.
- [ ] Welcome and campaign messages have recognizable sender identity, honest subjects, restrained links/images, and no attachments.
- [ ] HTML is tested in major clients, remains readable with images blocked, and contains no scripts, forms, remote fonts, or hidden content.
- [ ] Test messages are checked with Gmail “Show original” and at least one non-Google mailbox; links and unsubscribe are exercised end to end.
- [ ] Volume starts low and increases gradually; no cold, purchased, scraped, or stale list is used.
- [ ] Google Workspace limits, bounce rate, complaint signals, DMARC reports, and domain reputation are monitored.
- [ ] Inbox placement is described as an optimization outcome, never a guarantee.

## Verification record

- Provider-removal search: passed outside this report. No Kit/ConvertKit/Loops imports, provider URLs, or provider environment-variable references remain.
- Subscribe non-transmission review: passed. The form has no action or handler; its input and button are disabled; no email is logged, persisted, or sent.
- Subscribe rendering: passed. `/subscribe` was statically generated in the production build.
- Type checking: passed as part of `next build`.
- Linting: the existing `npm run lint` command invokes deprecated `next lint` and opens an interactive first-time ESLint configuration prompt because the repository has no ESLint configuration. It did not produce a standalone lint result. The build’s built-in “Linting and checking validity of types” phase passed.
- Unit tests: not run because `package.json` defines no test script and no tests were found.
- Production build: passed with Next.js 15.5.19; all ten static pages were generated.
- Files removed: none.
- Packages removed: none; no hosted newsletter provider package existed.
- Environment-variable names removed: none; no hosted newsletter provider variables existed in the repository.
- External systems: Cloudflare DNS, Google Workspace, and the Vercel dashboard were not accessed or modified.
