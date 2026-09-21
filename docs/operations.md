# Operations and deployment

## Local topology

The tested topology is one Next.js Node process on port 3000, one worker, real PostgreSQL 18.4 on 54329, local S3-compatible storage on 9000, SMTP on 1025 and inbox on 8025. Every fallback service binds to loopback. The fallback database directory and objects persist under `.local/`. Keep those ignored and never serve them as static assets. Fallback SMTP raw mail is also stored in `.local/mail.jsonl` and contains recovery links: treat it as sensitive.

Docker Compose provides PostgreSQL 18, MinIO, Mailpit and named volumes. It is an alternate local topology, not something tested on this Docker-less host. Startup order: services healthy → database migrations → seed (development only) → app → worker. Verify `/api/v1/health` before browsing.

## Full production route

1. Provision a host/container runtime, supported PostgreSQL, durable S3-compatible bucket, authenticated SMTP, DNS and HTTPS reverse proxy. No services were purchased or deployed by this task.
2. Start with a **fresh non-demo database and bucket**. Do not promote the local seeded database. Set DATABASE_URL, BETTER_AUTH_SECRET (cryptographically random), BETTER_AUTH_URL (`https://...`), SMTP variables, S3 variables and RESERVATION_HOURS. Set `DEMO_MODE=false`, `PAYMENT_SIMULATOR=false`. Use a least-privilege database/storage principal for ordinary requests and a migration principal when needed.
3. Build the included Dockerfile. Image runs as the non-root `node` user. Prisma and tsx remain runtime tools for migrations/worker; development service packages are pruned. Do not bake `.env` or `.local` into the image.
4. Run `node node_modules/prisma/build/index.js migrate deploy` as a one-off task using the release image and production environment. Install `pg_trgm` with an authorized database role if the service restricts extensions.
5. Start `node server.js` for the app and `node node_modules/tsx/dist/cli.mjs scripts/worker.ts` for a separate continuously running worker. Restart workers after code/config changes. Expose only app HTTP through the proxy; no public database, object-management console or inbox.
6. Put Caddy/nginx or the runtime's HTTPS ingress in front. `deploy/Caddyfile` is a base Caddy configuration (domain via REBUILD_DOMAIN), compression, a 9 MB request limit and HSTS. Restrict slow requests and apply network-level rate limits. BETTER_AUTH_URL must match browser Origin. Secure auth cookies need HTTPS.
7. Create/verify the owner account through email. A trusted server operator may run `npx tsx scripts/promote-user.ts owner@example.com ADMIN`. There is no user-facing role assignment endpoint.
8. Test email delivery, image upload/read, moderation, both order actors, expiry, jobs, backup restore and provider credentials in staging before allowing public commerce. Missing payment credentials leave the free listing/pickup workflow available.

`docker compose --profile full up --build -d app worker` is the provided container orchestration starting point after services/migrations/configuration. It overrides internal service hostnames, disables demos/simulator and binds app HTTP to loopback. Configure HTTPS before testing production authentication. MinIO and Mailpit in the base Compose are local service choices; use production SMTP and appropriate durable object storage for deployment.

## Jobs and observability

Run one worker initially. Leases allow multiple workers to claim safely, and database locks protect expiry. Each cycle expires reservations/promotions, claims up to 40 jobs, delivers emails/matches and removes unassigned images older than 24 hours. Eight failed attempts leave a pending job requiring operator attention. Admin Jobs shows kind, attempt count, processing state and a sanitized failure message, never email payloads/tokens.

API responses carry X-Request-ID and JSON requestId. Error logs contain route/method/code/status, with no request body or recovery token. In non-production, unexpected internal exceptions are more verbose. Worker logs show cycle counts/failure; do not enable SMTP wire logging or log provider URLs containing credentials.

Health currently checks PostgreSQL only. Add monitored S3/SMTP synthetic checks and alerting before launch; a green HTTP health result is not proof that mail/storage works. Rate limiting uses the database and applies across app instances. Add trusted ingress IP throttling for public search and auth abuse as described in security.md.

## Backups and restore drill

- PostgreSQL: scheduled encrypted `pg_dump --format=custom` backups with off-host retention and restricted access. Example local command: `docker compose exec -T postgres pg_dump -U rebuild -d rebuild -Fc > rebuild.dump` (use a binary-safe shell; on Windows use PowerShell 7.4+ native binary redirection or run pg_dump inside a shell/container).
- Objects: enable versioning where available; take a separate encrypted off-host bucket backup (`mc mirror` or provider backup), not merely a container volume snapshot. Keep the database/object backup timestamps recorded together.
- Store auth/provider secrets separately in a secrets manager with recovery procedures. Don't include credentials in committed scripts or copyable command output.
- Restore into an isolated empty database using `pg_restore --clean --if-exists --no-owner --dbname=...`, restore the associated bucket, set staging env and apply any newer migrations. Never test restore over the only production database.
- Verify account/session behavior, image references, public/private access, a known completed order snapshot and inventory checks (`reserved + sold <= total`). Reconcile HELD reservations against orders, then run the worker. Record recovery time and missing-data window.

No real backup/restore drill or Docker deployment was run during this task; these remain explicit launch checks.

## Account deletion

Use the reporting flow to request deletion. An authorized operator confirms ownership, resolves active orders, checks retention duties, and runs `scripts/anonymize-user.ts`. It removes profile/auth identifiers and saved preferences, archives listings, and preserves transaction/dispute evidence. It is partial anonymisation, not a promise of complete deletion from all messages, backups or third-party SMTP logs. The owner must adopt a legally reviewed retention schedule.

## Likely costs

App/worker CPU and memory, PostgreSQL storage/connections/backups, original plus thumbnail object storage, image egress, transactional email, monitoring and payment fees. No provider prices or scale claims are invented. A small single-host deployment may be adequate for pilot validation but requires measured capacity and recovery testing.
