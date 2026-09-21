# ReBuild Bangladesh: a material-specific pickup marketplace

## Customer problem

Renovation leftovers are difficult to trade when ordinary classified listings omit batch, dimensions, usable quantity or whether a seller will split a lot. This implementation explores a Dhaka marketplace where a buyer can request three of eight boxes while seeing enough specification detail to discuss compatibility with the seller.

## Design and implementation

The storefront uses warm ivory, forest green and restrained terracotta, with material photography, visible price units and approximate locations. Search supports English, Bangla and material codes. Structured fields power filters, same-category comparison and a coverage calculator. Wanted matches show known matches, mismatches and missing information; they do not promise compatibility.

A Next.js modular monolith shares application services between server-rendered pages and REST handlers. PostgreSQL holds relational listings, inventory, orders, conversations, moderation, payments and an outbox. Prisma provides typed persistence while explicit SQL locks protect the inventory transition where correctness matters most.

Pending requests do not reserve inventory. Acceptance locks the lot, releases overdue holds, checks price and available stock, then creates a reservation atomically. Both actors must confirm handover; cancellation, expiry and retries cannot apply stock changes twice. Price/quantity/pickup snapshots preserve the agreed transaction when listing details change.

Better Auth handles credentials and recovery. Server-side participant/role checks, suspension revocation, sanitized public DTOs, decoded image uploads and state-free payment redirects protect the principal trust boundaries. The platform collects no buyer material funds. The development promotion simulator and fixture-tested SSLCOMMERZ adapter are explicitly distinguished from a live provider transaction.

## Evidence and limits

See [testing.md](testing.md), [performance results](performance/summary.json), and [screenshots](screenshots/) for actual outcomes. Real PostgreSQL tests cover stock concurrency and idempotency; browser tests follow the seller–moderator–buyer journey and account recovery. [Launch readiness](launch-readiness.md) records incomplete localization, fractional/distance features, external credentials and deployment hardening.

This is synthetic local demonstration data, not evidence of users, revenue, production scale or environmental savings. Implementation was created with OpenAI Codex assistance. Frameworks, libraries and stock photographs retain their own authorship/licenses; image sources are recorded in `public/materials/sources.json`.
