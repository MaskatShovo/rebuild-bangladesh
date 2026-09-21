# Security implementation and remaining work

## Implemented controls

- Better Auth owns password hashing (scrypt), signed HttpOnly sessions, email verification, expiring reset tokens and revocation. Reset revokes existing sessions. Cookie caching is disabled so current database state is read.
- Registration/profile input cannot set roles, verified status or suspension. Protected APIs fetch the current member and reject suspended accounts; suspension revokes sessions immediately. Public listing/seller queries exclude suspended sellers.
- Per-resource checks protect listing edits, private conversations, orders, reviews, admin operations and uploads. Public DTOs explicitly select allowed fields; precise pickup details are not in public listing responses. Order pickup snapshots are only returned to participants after acceptance.
- Cookie-authenticated mutations require the exact configured Origin. Better Auth separately enforces origin checks. Only payment server callbacks bypass browser Origin/session rules, and only server-validated IPNs update payment state.
- SQL is parameterized. The inventory lock, CHECK constraints, unique request keys, one pending request per buyer/listing and unique reservation/payment-event keys provide database-level protections against overselling/duplicates.
- React renders text without raw HTML insertion. CSP restricts sources, frames, base URI and form targets. Production removes unsafe-eval; inline script/style remains needed for the current Next setup. Frame denial, no-sniff, referrer and permissions policies are configured.
- Uploads have byte and pixel limits, actual decodability/format checks, permitted JPEG/PNG/WebP inputs, orientation correction, stripped metadata, generated WebP thumbnails, random keys and owner checks. SVG/executable images are rejected. The server does not fetch user-supplied image URLs. Abandoned uploads expire after 24 hours.
- Database-backed auth/API throttling works across instances. Mutation limits are per member/resource/minute. A reverse proxy must enforce request-size and slow-request limits before Next buffering.
- `.env`, `.local`, recovery inbox and generated passwords are git/Docker ignored. Demo seed/setup refuse NODE_ENV=production. Simulator routes explicitly return 404 in production, even if PAYMENT_SIMULATOR=true. Provider success redirects are state-free.
- Reports and admin actions record audit reasons. Reports/disputes never directly restore stock or mark a provider refund complete.

## Operational limitations requiring review

- Public search/IP-based rate limiting and trusted proxy configuration need deployment-specific hardening. Auth library database limits and member mutation limits are implemented; distributed adversarial traffic is not load-tested.
- Nonce-only strict CSP is not yet implemented. The current production policy retains unsafe-inline for Next hydration. No pen test or third-party security assessment has been performed.
- SMTP delivery is at-least-once under a crash between send and acknowledgement; database notifications are exactly deduplicated. Audit/retention/deletion policies need owner/legal review.
- S3rver is a development-only fallback with known transitive advisories. It binds only to loopback and is pruned from the production container. Use MinIO or a maintained S3 service outside this test setup. See actual audit counts in testing.md.
- Recovery mailbox/bucket/database privileges and secrets rotation must be tested in the actual deployment. Local sign-up mails never leave the local inbox.
- Anonymisation preserves transaction/message/dispute evidence; it is not comprehensive erasure from backups or conversation text.
- Live SSLCOMMERZ initiation, IPN reachability, exact merchant-required fields, refunds and settlement are not verified. The sandbox adapter remains disabled without credentials. No buyer material funds are collected.

## Inventory security notes

Money is integer paisa, listing inventory is a bounded integer count, dimensions are integer millimetres. Requests cannot supply totals, roles, stock, order status or payment success. The server snapshots/recomputes those values and checks price changes again at acceptance. Cancellation after any handover confirmation is refused, and completion requires both actors. Worker delay cannot let an old reservation block a later valid acceptance indefinitely: the acceptance transaction expires overdue holds under the lot lock.
