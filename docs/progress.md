# Implementation handover — 21 September 2026

The local implementation and verification pass are finished. This does not mean every launch requirement is complete: [launch-readiness.md](launch-readiness.md) lists the exact external dependencies and deferred work.

## Working now

The app is available at http://localhost:3000 while the local processes remain running. PostgreSQL, S3-compatible storage, SMTP inbox and worker are running locally. Restart commands are in README. Random local account credentials are in `.local/demo-access.json` and are deliberately excluded from source control.

The complete seller → moderator → buyer request → reservation → ready → dual handover → review journey is implemented and browser-tested. Eight boxes minus a completed three-box pickup leaves five available. Authentication/recovery, private messages, saves/alerts, wanted matching, moderation/reports and the development promotion product are also implemented.

## Final verification

- 27 domain/database/provider-fixture tests passed.
- All 6 end-to-end tests passed. After visual refinements, the two affected storefront/order journeys passed again.
- Formatting, lint, TypeScript and production build passed.
- Production dependency audit: zero vulnerabilities; four development-only S3rver transitive advisories remain.
- Homepage axe: zero selected-rule violations. Desktop/mobile and completed-order screenshots inspected.
- Mobile Lighthouse: home **91 performance / 100 accessibility**, browse **94 / 100**, detail **86 / 96**. Detail misses the 90 performance target. CLS after correction is approximately 0.00005 on all measured pages. Full reports retain SEO and best-practice findings as well.

See [testing.md](testing.md) for profile, commands, limitations and reports. Lighthouse sampled seeded data plus E2E records; archived test listings/wanted requests were subsequently removed from public discovery for the final screenshots. Transaction history is preserved.

## Exact next steps

1. Use the local demo script to evaluate matching and pickup with a small Dhaka pilot group.
2. Complete the documented bilingual/UI and high-volume pagination gaps based on pilot feedback.
3. In an authorized staging environment, execute the Docker stack, real SMTP/S3 checks and backup/restore drill with a fresh non-demo database.
4. Supply merchant sandbox credentials and test SSLCOMMERZ initiation, server callbacks and duplicate events before enabling online promotion payments. Implement confirmed provider refunds separately.
5. Finish owner policy/security/operations review before any public launch. No external deployment has been performed.
