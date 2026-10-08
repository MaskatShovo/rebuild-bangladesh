# ReBuild Bangladesh

A local-first marketplace for usable renovation leftovers in Dhaka. This implementation includes a real PostgreSQL database, authenticated REST API, responsive Next.js storefront, seller/moderator dashboards, private messages, wanted materials, and a complete pay-on-pickup order workflow.

**This is a business foundation and demonstration, not a claim of readiness for live commerce.** All seeded sellers/listings are fictional. Material photographs are illustrative stock images. The public demo is hosted at **https://rebuild-bangladesh-one.vercel.app**, with Gmail verification/reset delivery and account registration enabled. New listings require moderator approval; seeded seller accounts cannot sign in to production. No live payment has been performed.

## Quick start (no Docker required)

Requires Node.js 24, npm, and the downloaded source. Works on Windows; the included fallback starts a real PostgreSQL binary, a local SMTP receiver, and an S3-compatible development server.

```sh
npm ci
npm run local:setup
npm run db:generate
npm run local:services
```

Keep that terminal running until it reports that services are ready. In a second terminal:

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

In a third terminal:

```sh
npm run worker
```

Open **http://localhost:3000** (use `localhost`, matching the configured auth origin). The inbox is **http://127.0.0.1:8025**; in fallback mode it displays JSON messages. Email delivery is asynchronous, normally within five seconds.

The seed generates random passwords in **`.local/demo-access.json`** for `buyer@rebuild.local`, `seller@rebuild.local`, `seller2@rebuild.local`, `moderator@rebuild.local`, and `admin@rebuild.local`. Read that local file for access. Passwords are not committed or printed in build output. One member account can buy and sell; moderator/admin roles are assigned only by seed or a trusted server operator.

Do not run fallback services and Docker services on the same ports. Existing unrelated workspace files are ignored and preserved. `local:setup` preserves an existing `.env`; use `.env.example` when changing infrastructure.

## Docker Desktop / Docker Compose

On a **fresh checkout with no `.env`**, run:

```sh
npm ci
npm run local:setup -- --docker
docker compose up -d postgres minio storage-init mailpit
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Run `npm run worker` separately. Mailpit provides its visual inbox at `http://localhost:8025`; MinIO console is at `http://localhost:9001`. Credentials are in your generated `.env`.

For an existing fallback `.env`, set `POSTGRES_PASSWORD` to the password from `DATABASE_URL`, and replace both S3 credentials with your own values (MinIO secret at least 8 characters). Stop fallback services first. Docker has separate persistent volumes; migrate and seed that new database explicitly. The Docker setup files are provided but **were not executed here because Docker is not installed**.

## Working journeys

- Seller: sign in → Profile & security → add seller display name → Sell materials → add structured details and photographs → save draft or submit for review.
- Moderator: sign in → Moderation → inspect photos/disclosures → enter a reason → approve/reject. Editing an approved listing removes it from public discovery until re-approved.
- Buyer: browse/filter or search English/Bangla/model code → compare up to three same-category materials → inspect details and coverage calculator → request quantity.
- Seller: Requests & orders → accept and reserve → mark ready → confirm physical handover.
- Buyer: confirm physical handover → review completed pickup. Seller payment confirmation is a separate action; ReBuild never collects material-purchase funds.
- Either participant: cancel before either handover confirmation. The worker and transactional acceptance paths expire holds and release inventory exactly once.
- Wanted board, actual listing responses, possible match explanations, saved listings/search alerts, private polling messages, blocks, reports, suspension, and audit queues are implemented.
- Featured listing purchase: local simulator provides success/failure/cancellation/duplicate/refund events. The SSLCOMMERZ **sandbox adapter is credential-dependent and fixture-tested only**. No live provider transaction was tested.

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm test` applies migrations and resets **only `rebuild_test`**, a separate real PostgreSQL database; it refuses any other database suffix. Fallback setup creates this database. With Docker, create it first:

```sh
docker compose exec postgres createdb -U rebuild rebuild_test
```

Playwright requires the app, seed, local storage, SMTP and worker to be running. It uses installed Google Chrome; install Chrome or change `channel` in `playwright.config.ts` and run `npx playwright install chromium`. Tests create clearly named E2E listings and members. Email tests support the fallback inbox; see `docs/testing.md` for the Mailpit adjustment and complete measured results.

## Structure and documentation

| Area                                            | Location                                      |
| ----------------------------------------------- | --------------------------------------------- |
| Pages and route handlers                        | `src/app/`                                    |
| Shared business services                        | `src/lib/`                                    |
| Interactive components                          | `src/components/`                             |
| Relational schema and SQL constraints           | `prisma/`                                     |
| Local services, worker, seed, operator commands | `scripts/`                                    |
| Database and browser tests                      | `tests/`                                      |
| REST contract                                   | `docs/openapi.json`, `docs/api.md`            |
| Architecture and decisions                      | `docs/architecture.md`, `docs/decisions.md`   |
| Operations and security                         | `docs/operations.md`, `docs/security.md`      |
| Actual verification and remaining launch work   | `docs/testing.md`, `docs/launch-readiness.md` |
| Recruiter case study and demo                   | `docs/case-study.md`, `docs/demo-script.md`   |

Production deployment uses the Node container, PostgreSQL, S3-compatible storage, SMTP and a separate worker, behind HTTPS. Follow `docs/operations.md`; a frontend preview is not a full deployment.

The hosted browsing demo uses Vercel, Neon PostgreSQL and private Vercel Blob. See [hosted-demo.md](docs/hosted-demo.md) for its configuration, verification and limits. Uploads now have a 4 MB limit to fit Vercel's request limit.

**Next business validation:** observe five Dhaka renovation homeowners and five small contractors attempting to match real leftover tile batches and arrange pickup. Measure how often a usable specification/quantity/location match actually happens before investing in online material payments or transport integrations.
