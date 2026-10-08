# Public demo — 8 October 2026

URL: https://rebuild-bangladesh-one.vercel.app

Owner/team: `maswashovo3500-gmailcoms-projects`, project `rebuild-bangladesh`. CLI was explicitly aligned with the user's browser login after discovering an older laptop account. The preliminary empty project/image store created in the older `maskatibnewahidshovo-4179s-projects` account were not used for this deployment.

## Published scope

The user initially chose **publish browsing first, email setup later**, then authorized Gmail setup and account activation. Friends can browse fictional materials, search/filter, view details/coverage, compare materials, explore the wanted board and switch English/Bangla. `ACCOUNTS_ENABLED=true` now enables real registration, email verification, sign-in and password reset. Verified members can access account workflows. New listings require moderator approval; the owner still needs a verified account and trusted operator role assignment to moderate them. Seeded sellers cannot sign in to production, so their fictional listings do not represent sellers who can complete pickups.

Sample sellers/listings/orders were initialized separately in a new hosted database; the laptop database was not uploaded. Production session hooks reject seeded `demo-` identities. No public admin credentials, simulator or local inbox was exposed. The demonstration banner identifies fictional data. Robots/meta directives discourage indexing.

## Runtime

- Vercel Node.js 24, Next.js 16.4.0; web/functions region Singapore (`sin1`). Builds may run in Vercel's default build region.
- New Neon Free (`free_v3`) PostgreSQL in Singapore, with both SQL migrations applied. Runtime uses the pooled URL; migration used the unpooled URL.
- New private Vercel Blob store in Singapore. The server decodes/strips metadata/transcodes images before storage and serves them only through the authorized media endpoint. S3 remains the default local/container adapter.
- `JOB_DISPATCH=after` runs leased outbox jobs after successful mutations/auth POSTs. Protected `/api/jobs` has a daily Hobby cron fallback. Transactional expiry keeps acceptance/public stock correct between cycles. A continuously running worker remains the preferred container configuration.
- Gmail SMTP uses TLS on port 465. Sender credentials and App Password are Vercel production secrets, with an ignored local operator copy. The payment simulator remains disabled.

New Next/sharp patches and updated source-map-js were installed before publishing because the earlier pins had received security advisories. Production dependency audit after updates reported zero vulnerabilities; this is a dated observation.

## Verification and maintenance

`docs/hosted-verification.json` records the live browsing checks; `docs/screenshots/public-live-home.png` is the actual public render. Public database health/listing routes returned 200 without a Vercel login, and unauthenticated job requests returned 401. The authorized protected job cycle was checked separately. Local regression checks: 27 automated tests and the two affected storefront/transaction browser journeys passed; formatting/lint/types/build passed.

`docs/hosted-auth-verification.json` records the account activation checks against the public production alias. The browser registered a temporary Gmail alias account, confirmed unverified sign-in was blocked, followed the verification link, signed in, requested a password reset, followed the reset link, confirmed previous sessions were revoked and the old password failed, and signed in with the new password. Verification/reset outbox rows were processed by the hosted worker. No browser runtime errors occurred. The temporary account and its email jobs were removed. The user also confirmed receipt of the initial setup email; a separate hosted worker setup email was sent successfully.

To update, verify the target first:

```sh
npx vercel@63.0.2 project inspect --scope maswashovo3500-gmailcoms-projects
npx vercel@63.0.2 --prod --yes --scope maswashovo3500-gmailcoms-projects
```

`.vercelignore` excludes local secrets, database files, private output and test artifacts. `.local/hosting-config.env`, `.local/vercel-production.env` and `.local/hosting-email.env` are ignored local operator files containing secrets; never upload or commit them. `.env` remains the laptop's configuration. Hosted credentials were never placed in client bundles or published documentation.

Accounts are now enabled. Create a real verified owner account and assign its role through the trusted operator process; don't reuse blocked seed accounts. Gmail sender setup does not create an application administrator. Review the existing launch-readiness/policy/security checklist before allowing real trades. Improve retry scheduling/monitoring as traffic grows; daily cron alone is not a promise of prompt idle-period delivery. If Google revokes the App Password, replace the SMTP secret and redeploy, then recheck delivery.

No paid plan upgrade or domain purchase was made. Provider free limits, sleep/cold starts and account quotas still apply. The demo runs remotely and does not require the laptop to remain on.
