# API guide

The executable contract is `openapi.json` (54 versioned REST operations). Regenerate it after changing validation using `npx tsx scripts/openapi.ts`. It documents parameters, request schemas, responses, cookie authentication, errors, pagination and idempotency. Some dashboard/nested read payloads deliberately permit additional relational fields; the public listing schema names the privacy boundary.

## Authentication

Better Auth implements JSON endpoints under `/api/auth`:

| Method/path                     | Body / effect                                                      |
| ------------------------------- | ------------------------------------------------------------------ |
| POST `/sign-up/email`           | `{name,email,password,callbackURL,locale?}`; verification required |
| POST `/sign-in/email`           | `{email,password}`; sets signed session cookie                     |
| POST `/sign-out`                | Revokes current session                                            |
| GET `/get-session`              | Current session                                                    |
| POST `/send-verification-email` | `{email,callbackURL}`                                              |
| GET `/verify-email`             | Library-issued expiring token from email                           |
| POST `/request-password-reset`  | `{email,redirectTo}`; non-enumerating result                       |
| GET `/reset-password/{token}`   | Email link redirects to configured reset UI                        |
| POST `/reset-password`          | `{token,newPassword}`; single-use, revokes sessions                |
| GET `/list-sessions`            | Own sessions, used only by account security UI                     |
| POST `/revoke-session`          | `{token}` of own session                                           |
| POST `/revoke-other-sessions`   | Revokes other sessions                                             |

Passwords require at least 10 characters. API cookies are HttpOnly; production uses secure cookies. Use the exact BETTER_AUTH_URL origin in browsers and Origin headers. Cross-site mutations fail with CSRF/403. Better Auth applies its own origin protection to its endpoints.

## Request example

After signing in and retaining cookies, POST `/api/v1/orders`:

```http
Origin: http://localhost:3000
Content-Type: application/json
Idempotency-Key: a-unique-request-key-123

{"listingId":"demo-tiles-1","quantity":3}
```

The server computes price and total. A successful response has `data.status = PENDING`; no reservation exists yet. A seller POST to `/orders/{id}/accept` atomically rechecks availability and creates the hold. Acceptance/handover/cancellation are themselves state-idempotent; repeated matching request keys replay creation.

Successful JSON responses: `{data: ..., requestId: "..."}`. Validation failures are 422 with `{error:{code:"INVALID_INPUT",message:"...",fields:[{path:"title",message:"..."}]},requestId:"..."}`. State/stock/idempotency conflicts use 409. Missing resources and inaccessible participant resources use 404. An unauthenticated request uses 401; insufficient privileges, suspension or wrong origin use 403.

## Read and pagination rules

- Listings: `/listings?q=RC-1600&category=tiles&area=Dhanmondi&quantity=3&page=1&sort=price-low`, 12 items/page, totals/pages returned. Prices in query filters are taka; stored/returned money is paisa.
- Orders/wanted: 20/page, newest first. Conversation messages: 30/page, page 1 is newest, displayed in chronological order within the page.
- Private dashboard `/me` and admin queue collections cap at 100 (audit/jobs 50). Full cursor pagination for high-volume dashboards is a launch follow-up; public browsing/messages/orders have pagination now.
- Media: binary sanitized WebP response, not JSON. Public approval or owner/moderator required. `?full=1` returns larger sanitized image.
- Saved-search alerts only process newly published listings, match configured filters, and deduplicate by search/listing. Email additionally requires profile opt-in.

## Payment callbacks

POST `/payments/ssl-ipn` is a provider exception to browser cookie/Origin requirements. It takes `val_id`, calls the configured sandbox validation server, rejects mismatched/risky responses and verifies amount/currency/provider/transaction identity against the database. GET/POST `/payments/return` only redirects; it never activates a promotion. Missing credentials return 503. Simulator routes return 404 in production.

User-visible errors are localized by the `locale` cookie (`en`/`bn`), not by translating user content. Auth library error strings and some admin/matching labels still need complete Bangla mapping.
