# ReBuild Bangladesh implementation checklist

The user-supplied master prompt is the implementation specification. Existing images, output/ and tmp/ are unrelated and will be preserved.

## Plan

1. Foundation: strict Next.js/TypeScript, Prisma/PostgreSQL schema and migrations, local services, authentication and design system.
2. Transaction slice: seller drafts and images → moderation → discovery → request → atomic reservation → dual handover → review.
3. Marketplace: search/filter/compare/calculator, wanted board, saved searches, messaging, account/seller/admin dashboards.
4. Operations: outbox worker, promotions and development payment simulator, uploads, security, deployment and API documentation.
5. Verification: real PostgreSQL concurrency/integration tests, Playwright desktop/mobile checks, accessibility/performance measurements, build, and handover.

## Assumptions

- New app at workspace root; no compatible application or repository instructions found.
- Whole-number sale increments (boxes, pieces, sets, packs) initially; dimensions in millimetres, weight in grams, prices in paisa. Fractional area is calculated, not an inventory unit.
- Separate listing/lot for each batch. Pickup only, with buyer-arranged transport.
- Free listing is default. Promotion simulator is local-only; provider credentials are not assumed.
- Docker is unavailable in this execution environment. Use embedded real PostgreSQL for verification, and supply Docker Compose for ordinary local development.
- No external publication is authorized.

## Checklist

- [x] Foundation and authentication
- [x] Complete inventory/order vertical slice
- [x] Discovery, messaging, wanted, saves, profiles, reviews
- [x] Moderation, reports, admin audit and operational controls
- [x] Promotions, outbox and expiry (live provider verification remains credential-dependent)
- [x] Security, tests, browser and build checks (representative coverage, not certification)
- [x] Documentation, case study, screenshots and launch gaps

See docs/progress.md for the final verified status and exact remaining steps.
