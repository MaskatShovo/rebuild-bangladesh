# Launch readiness

This is a working local business foundation, not a production-readiness certification.

## Implemented

- PostgreSQL migrations, structured category attributes, integer paisa/counts, constraints and transactional inventory locks.
- Verified-email accounts, recovery/revocation, seller onboarding, drafts/images, moderation and re-review.
- English/Bangla discovery, specification filters, comparison, coverage, wanted requests and explained possible matches.
- Saved items/search alerts, private messages, blocking, reports, participant orders, dual handover, reviews and audit controls.
- Free pickup trading, separate cash confirmation, expiring featured placements, development payment scenarios and retryable outbox.
- Responsive customer pages, policy drafts, deployment files, OpenAPI and operational documentation.

## Verified locally

See [testing.md](testing.md) for exact results. Real PostgreSQL tests exercise competing acceptances, repeated events, expiration and stock conservation. Browser tests exercise actual uploads, moderation, partial pickup completion, review eligibility, private-resource denial and email recovery. Production build and representative mobile Lighthouse measurements use the same application source.

## External dependencies

- SSLCOMMERZ merchant sandbox credentials, reachable callback URL and a real sandbox transaction are required to validate the provider integration. Fixture tests are not live integration evidence. Real provider refunds are not implemented.
- Production SMTP credentials, a durable S3 service, PostgreSQL host, HTTPS domain and an authorized deployment target are required for a public launch. None were purchased or deployed.
- Docker/Compose artifacts could not be executed because this host has no Docker. A staging container smoke test and backup/restore drill remain required.

## Remaining product and operational work

- Core English/Bangla interfaces and transactional emails are implemented; some administrative labels, match explanations and third-party validation errors still need full Bangla review. Complete bilingual acceptance testing before advertising full localization.
- Inventory currently supports whole sale units only. Fractional stock requires explicit precision/increment changes across schema, validation and tests.
- Search uses district/area. Permission-based distance search is not implemented. No coordinates or distances are invented.
- Dashboard lists have bounded limits; comprehensive pagination for every high-volume administrative view remains to be completed.
- Accessibility evidence is representative, not a full WCAG certification. Complete assistive-technology review of every form/dialog and error state.
- Complete deployment-specific ingress throttling, strict nonce CSP, capacity testing, monitoring, retention policy and recovery drills. Review development dependency advisories before using fallback tools on other networks.
- Local MinIO is pinned on Quay. Its upstream repository was archived in April 2026; select a maintained production object-storage service and review its support/security lifecycle ([upstream](https://github.com/minio/minio)).
- Generated policy drafts require the owner's review. Anonymisation preserves historical transaction evidence and does not erase all message text/backups.

## Most useful business validation

Recruit a small group of Dhaka renovation sellers and buyers and observe actual matching/pickup attempts. Measure whether batch/specification accuracy and smaller quantities solve a real sourcing problem before investing in promotion or logistics integrations. Do not count synthetic seed transactions as traction.
