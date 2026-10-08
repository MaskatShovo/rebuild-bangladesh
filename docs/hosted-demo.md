# Public browsing demo — 8 October 2026

URL: https://rebuild-bangladesh-one.vercel.app

Owner/team: `maswashovo3500-gmailcoms-projects`, project `rebuild-bangladesh`. CLI was explicitly aligned with the user's browser login after discovering an older laptop account. The preliminary empty project/image store created in the older `maskatibnewahidshovo-4179s-projects` account were not used for this deployment.

## Published scope

The user chose **publish browsing first, email setup later**. Friends can browse fictional materials, search/filter, view details/coverage, compare materials, explore the wanted board and switch English/Bangla. Auth POST endpoints return 503 with an explicit unavailable message; the account page explains the restriction. Registration, messages, saves, wanted creation and trading require accounts and remain unavailable on this hosted demo. The full local implementation still supports those workflows.

Sample sellers/listings/orders were initialized separately in a new hosted database; the laptop database was not uploaded. Production session hooks reject seeded `demo-` identities. No public admin credentials, simulator or local inbox was exposed. The demonstration banner identifies fictional data. Robots/meta directives discourage indexing.

## Runtime

- Vercel Node.js 24, Next.js 16.4.0; web/functions region Singapore (`sin1`). Builds may run in Vercel's default build region.
- New Neon Free (`free_v3`) PostgreSQL in Singapore, with both SQL migrations applied. Runtime uses the pooled URL; migration used the unpooled URL.
- New private Vercel Blob store in Singapore. The server decodes/strips metadata/transcodes images before storage and serves them only through the authorized media endpoint. S3 remains the default local/container adapter.
- `JOB_DISPATCH=after` runs leased outbox jobs after successful mutations/auth POSTs. Protected `/api/jobs` has a daily Hobby cron fallback. Transactional expiry keeps acceptance/public stock correct between cycles. A continuously running worker remains the preferred container configuration.
- Email sending and payment simulator remain disabled/unconfigured for this public demo.

New Next/sharp patches and updated source-map-js were installed before publishing because the earlier pins had received security advisories. Production dependency audit after updates reported zero vulnerabilities; this is a dated observation.

## Verification and maintenance

`docs/hosted-verification.json` records the live browsing checks; `docs/screenshots/public-live-home.png` is the actual public render. Public database health/listing routes returned 200 without a Vercel login, and unauthenticated job requests returned 401. The authorized protected job cycle was checked separately. Local regression checks: 27 automated tests and the two affected storefront/transaction browser journeys passed; formatting/lint/types/build passed.

To update, verify the target first:

```sh
npx vercel@63.0.2 project inspect --scope maswashovo3500-gmailcoms-projects
npx vercel@63.0.2 --prod --yes --scope maswashovo3500-gmailcoms-projects
```

`.vercelignore` excludes local secrets, database files, private output and test artifacts. `.local/hosting-config.env` and `.local/vercel-production.env` are ignored local operator files containing secrets; never upload or commit them. `.env` remains the laptop's configuration. Hosted credentials were never placed in client bundles or published documentation.

To enable accounts later: configure and test a real SMTP sender, ensure the owner's email verification/reset delivery works, set `ACCOUNTS_ENABLED=true`, and deploy again. Create real verified accounts and assign the owner role through the trusted operator process; don't reuse blocked seed accounts. Review the existing launch-readiness/policy/security checklist before allowing real trades. Improve retry scheduling/monitoring as traffic grows; daily cron alone is not a promise of prompt idle-period delivery.

No paid plan upgrade or domain purchase was made. Provider free limits, sleep/cold starts and account quotas still apply. The demo runs remotely and does not require the laptop to remain on.
