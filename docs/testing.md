# Verification record

Executed on Windows with Node.js 24, installed Google Chrome, PostgreSQL 18.4, local S3rver, SMTP inbox and the background worker. No external production deployment was performed.

## Automated checks

- `npm test`: **27 passed, 0 failed**. Six domain tests, nineteen real PostgreSQL integration tests and two SSLCOMMERZ fixture contract tests.
- `npm run test:e2e`: **6 passed**. Desktop/mobile search, compare, Bangla and accessibility; seller image creation/moderation/re-review and partial pickup completion; promotion redirect/duplicate/refund scenarios; suspension/revocation; direct resource authorization, saves, wanted, messaging and rejected SVG; registration, verification mail, password reset single use and session revocation.
- Formatting, ESLint, TypeScript and production build passed. Following final visual edits, the two affected storefront/order browser journeys were rerun; results are recorded in progress.md.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full development audit reports four transitive advisories (three high, one moderate) in the local S3rver toolchain. It binds to loopback and is excluded from the production image. These results are point-in-time observations, not a security guarantee.

Integration tests migrate and reset a dedicated `rebuild_test` database and refuse an unsafe database suffix. This tests clean database state on every integration run. The local application was initially migrated and seeded from a fresh UTF-8 database. Docker fresh-checkout setup was not executed.

The browser tests exercise real services, not mocked API responses. The partial order checks eight total, zero reserved and three sold after completion. Permission tests issue direct API requests with different accounts. The sign-in helper respects server Retry-After throttling rather than disabling authentication limits for tests.

## Reproduction

Follow README setup, keep services/app/worker running, then run:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright uses Google Chrome via `channel: chrome`; adjust the channel and install Chromium if necessary. Browser tests add clearly marked E2E records to the local demonstration database. They must never target production. The email test currently consumes the fallback inbox's JSON array at port 8025. For Mailpit, adapt its two inbox reads to Mailpit's `/api/v1/messages` and message-detail API; the visual inbox itself works through ordinary application SMTP settings. The Mailpit variant has not been verified here.

## Visual, accessibility and performance evidence

Desktop and mobile full-page home screenshots and completed-order screenshots are in `docs/screenshots`. Actual renders were inspected. The homepage axe scan found **zero violations** for the selected WCAG A/AA rules. This does not cover every page or certify WCAG compliance.

Lighthouse 13.5.0 uses a production server on port 3001 and its default mobile simulated throttling profile: 412 × 823 emulated viewport, 4× CPU slowdown, 150 ms RTT and 1,638.4 Kbps throughput. See each report's `configSettings` for the exact run settings. Tests run on this local host, not a deployed mobile network. One measurement per page is recorded; scores vary with host load and cache state.

```sh
# After npm run build, in another terminal:
npm run start -- --port 3001
# Set CHROME_PATH if Chrome is not detected, then:
node scripts/performance.mjs
```

The final actual scores and timings are in [performance/summary.json](performance/summary.json); HTML reports are provided for home, browse and listing detail. The initial run exposed loading-related footer layout shifts and one hint contrast failure. Main content now reserves a viewport during loading, hints use darker text, and critical images have explicit loading priority. Remaining score limitations are reported, not hidden.

| Page           | Mobile performance | Accessibility |    LCP |     CLS |
| -------------- | -----------------: | ------------: | -----: | ------: |
| Home           |                 91 |           100 | 3.40 s | 0.00005 |
| Browse         |                 94 |           100 | 2.87 s | 0.00005 |
| Listing detail |                 86 |            96 | 3.27 s | 0.00005 |

Listing detail misses the performance target of 90. Its report also identifies a small comparison-link target, brand accessible-name mismatch, streamed metadata not recognized by the audit, and a browser CSP issue. These remain documented follow-ups; the report files are retained without editing findings.

## Evidence limits

CI includes format/lint/types/PostgreSQL tests/build. Browser checks were run locally; CI browser infrastructure is not configured. No live SSLCOMMERZ test, public deployment, Docker build, backup/restore drill, load test or external penetration test was run. Provider fixtures do not establish merchant acceptance. PostgreSQL driver emitted a future pg9 concurrency deprecation warning in the test toolchain; the pinned pg8 run passed.
