import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  listingSchema,
  wantedSchema,
  searchSchema,
} from "../src/lib/validation";
const schema = (s: z.ZodType) =>
  z.toJSONSchema(s, { io: "input", unrepresentable: "any" });
type Operation = {
  summary: string;
  security?: unknown[];
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
};
const paths: Record<string, Record<string, Operation>> = {};
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const envelope = (data: unknown) => ({
  type: "object",
  required: ["data", "requestId"],
  properties: { data, requestId: { type: "string" } },
});
function add(
  method: string,
  path: string,
  summary: string,
  body?: unknown,
  response: unknown = { type: "object" },
  authenticated = true,
  created = false,
) {
  const parameters: unknown[] = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));
  if (
    method === "get" &&
    ["/listings", "/orders", "/wanted", "/conversations/{id}"].includes(path)
  )
    parameters.push({
      name: "page",
      in: "query",
      schema: { type: "integer", minimum: 1, default: 1 },
    });
  if (method === "post" && ["/orders", "/payments"].includes(path))
    parameters.push({
      name: "Idempotency-Key",
      in: "header",
      required: true,
      schema: { type: "string", minLength: 8, maxLength: 100 },
      description:
        "Unique per user and operation. Reuse for network retries with identical request details.",
    });
  if (method !== "get" && !path.includes("ssl-ipn"))
    parameters.push({
      name: "Origin",
      in: "header",
      required: true,
      schema: { type: "string" },
      example: "http://localhost:3000",
    });
  const errors = Object.fromEntries(
    [400, 401, 403, 404, 409, 413, 422, 429, 500, 503].map((code) => [
      String(code),
      {
        description: (
          {
            400: "Invalid action",
            401: "Sign-in required",
            403: "Permission/verification/origin denied",
            404: "Missing or inaccessible resource",
            409: "Inventory/state/idempotency conflict",
            413: "Payload too large",
            422: "Field validation",
            429: "Rate limited",
            500: "Unexpected failure",
            503: "Provider unavailable",
          } as Record<number, string>
        )[code],
        content: { "application/json": { schema: ref("Error") } },
      },
    ]),
  );
  paths[path] ??= {};
  paths[path][method] = {
    summary,
    security: authenticated ? [{ sessionCookie: [] }] : [],
    parameters,
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: body } },
          },
        }
      : {}),
    responses: {
      [created ? "201" : "200"]: {
        description: created ? "Created" : "Success",
        content: { "application/json": { schema: envelope(response) } },
      },
      ...errors,
    },
  };
}
const object = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({ type: "object", properties, required, additionalProperties: false });
const str = { type: "string" },
  number = { type: "integer" };
add(
  "get",
  "/health",
  "Database readiness",
  undefined,
  object({ status: str }),
  false,
);
add(
  "get",
  "/session",
  "Current public session identity or null",
  undefined,
  { oneOf: [{ type: "null" }, { type: "object" }] },
  false,
);
add(
  "get",
  "/categories",
  "Active categories",
  undefined,
  {
    type: "array",
    items: object({
      id: str,
      name: str,
      nameBn: str,
      active: { type: "boolean" },
    }),
  },
  false,
);
add(
  "get",
  "/listings",
  "Search approved materials; 12 per page",
  undefined,
  object({
    items: { type: "array", items: ref("ListingPublic") },
    total: number,
    page: number,
    pages: number,
    filters: ref("SearchFilters"),
  }),
  false,
);
const filterJson = schema(searchSchema);
paths["/listings"].get.parameters = Object.entries(
  (filterJson as { properties: Record<string, unknown> }).properties,
).map(([name, s]) => ({ name, in: "query", schema: s }));
add(
  "get",
  "/listings/{id}",
  "Approved public listing",
  undefined,
  ref("ListingPublic"),
  false,
);
add(
  "post",
  "/listings",
  "Create a seller draft",
  ref("ListingCreate"),
  { type: "object" },
  true,
  true,
);
add(
  "put",
  "/listings/{id}",
  "Edit own listing; published edits become pending",
  ref("ListingCreate"),
);
for (const action of ["publish", "pause", "archive", "approve", "reject"])
  add(
    "post",
    `/listings/{id}/${action}`,
    `${action} listing; approve/reject require moderator and reason`,
    object(
      { reason: str },
      ["approve", "reject"].includes(action) ? ["reason"] : [],
    ),
  );
add(
  "post",
  "/uploads",
  "Sanitize and upload image; multipart file + alt",
  undefined,
  object({
    id: str,
    alt: str,
    objectKey: str,
    thumbnailKey: str,
    ownerId: str,
    listingId: { type: ["string", "null"] },
    contentType: str,
    createdAt: str,
  }),
  true,
  true,
);
paths["/uploads"].post.requestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: object({ file: { type: "string", format: "binary" }, alt: str }, [
        "file",
      ]),
    },
  },
};
add(
  "get",
  "/media/{id}",
  "WebP bytes; public approved or owner/moderator",
  undefined,
  {},
  false,
);
paths["/media/{id}"].get.responses["200"] = {
  description: "Sanitized WebP",
  content: { "image/webp": { schema: { type: "string", format: "binary" } } },
};
add(
  "get",
  "/sellers/{id}",
  "Public seller details, listings and eligible reviews",
  undefined,
  { type: "object" },
  false,
);
add("get", "/me", "Private dashboard, newest 100 records per collection");
add(
  "patch",
  "/me",
  "Update own profile; phone remains unverified",
  object(
    {
      name: str,
      sellerName: { type: ["string", "null"] },
      bio: { type: ["string", "null"] },
      area: str,
      phone: str,
      locale: { enum: ["en", "bn"] },
      emailAlerts: { type: "boolean" },
    },
    ["name", "area", "locale", "emailAlerts"],
  ),
);
add(
  "get",
  "/orders",
  "Participant orders, newest first, 20 per page",
  undefined,
  { type: "array", items: ref("Order") },
);
add(
  "get",
  "/orders/{id}",
  "Participant order with reservation and pickup snapshot",
  undefined,
  ref("Order"),
);
add(
  "post",
  "/orders",
  "Request purchase; does not reserve stock",
  object({ listingId: str, quantity: { type: "integer", minimum: 1 } }),
  ref("Order"),
  true,
  true,
);
for (const action of [
  "accept",
  "decline",
  "cancel",
  "ready",
  "handover",
  "payment-received",
])
  add(
    "post",
    `/orders/{id}/${action}`,
    `${action} under actor/state/stock checks`,
    undefined,
    ref("Order"),
  );
add(
  "post",
  "/orders/{id}/review",
  "Eligible completed-order buyer review; one per order",
  object({
    rating: { type: "integer", minimum: 1, maximum: 5 },
    body: { type: "string", minLength: 5, maxLength: 2000 },
  }),
  { type: "object" },
  true,
  true,
);
for (const method of ["post", "delete"])
  add(
    method,
    "/saved/{id}",
    `${method === "post" ? "Save" : "Unsave"} an approved listing`,
    undefined,
    { type: "object" },
    true,
    method === "post",
  );
add(
  "post",
  "/searches",
  "Save filters for new-listing alerts",
  object({ label: str, filters: ref("SearchFilters") }),
  { type: "object" },
  true,
  true,
);
add("delete", "/searches/{id}", "Remove own saved search");
add(
  "get",
  "/wanted",
  "Open wanted requests, 20 per page",
  undefined,
  { type: "array", items: { type: "object" } },
  false,
);
add(
  "get",
  "/wanted/{id}",
  "Public wanted request array",
  undefined,
  { type: "array", items: { type: "object" } },
  false,
);
add(
  "get",
  "/wanted/{id}/matches",
  "Possible matches with matched and unknown fields",
  undefined,
  { type: "array", items: { type: "object" } },
  false,
);
add(
  "post",
  "/wanted",
  "Post wanted request",
  ref("WantedCreate"),
  { type: "object" },
  true,
  true,
);
add(
  "post",
  "/wanted/{id}/respond",
  "Respond with an owned approved listing in the same category",
  object({ listingId: str }),
  { type: "object" },
  true,
  true,
);
add("delete", "/wanted/{id}", "Close own request");
add(
  "post",
  "/conversations",
  "Start/reuse listing conversation and send message",
  object({
    listingId: str,
    body: { type: "string", minLength: 1, maxLength: 2000 },
  }),
  { type: "object" },
  true,
  true,
);
add(
  "get",
  "/conversations/{id}",
  "Participant messages; 30 per page, newest page first; records read timestamp",
  undefined,
  { type: "object" },
);
add(
  "post",
  "/conversations/{id}",
  "Participant message; respects bidirectional blocks",
  object({ body: { type: "string", minLength: 1, maxLength: 2000 } }),
  { type: "object" },
  true,
  true,
);
for (const method of ["post", "delete"])
  add(
    method,
    "/blocks/{id}",
    method === "post" ? "Block member" : "Unblock member",
  );
add("post", "/notifications", "Mark all own notifications read");
add("post", "/notifications/{id}", "Mark own notification read");
add(
  "post",
  "/reports",
  "Report listing/user/conversation/order; order reports are disputes",
  object({
    targetType: { enum: ["LISTING", "USER", "CONVERSATION", "ORDER"] },
    targetId: str,
    reason: { type: "string", minLength: 10, maxLength: 2000 },
  }),
  { type: "object" },
  true,
  true,
);
add(
  "post",
  "/payments",
  "Purchase seven-day promotion for server price ৳199",
  object({ listingId: str }),
  { type: "object" },
  true,
  true,
);
add(
  "post",
  "/payments/{id}/simulate",
  "Development-only provider event simulator",
  object({
    state: { enum: ["SUCCESS", "FAILED", "CANCELLED", "REFUNDED"] },
    eventId: { type: "string", minLength: 8, maxLength: 100 },
  }),
);
add(
  "post",
  "/payments/ssl-ipn",
  "Credential-dependent sandbox notification; server validates val_id",
  object({ val_id: str }),
  { type: "object" },
  false,
);
paths["/payments/ssl-ipn"].post.requestBody = {
  required: true,
  content: {
    "application/x-www-form-urlencoded": { schema: object({ val_id: str }) },
  },
};
for (const method of ["get", "post"]) {
  add(
    method,
    "/payments/return",
    "Redirect only; never activates promotion",
    undefined,
    {},
    false,
  );
  paths["/payments/return"][method].responses = {
    "303": {
      description:
        "Redirect to promotion dashboard without changing payment state",
    },
  };
}
add(
  "get",
  "/admin",
  "Moderator queues, users, audit, jobs and defined activity metrics",
);
add(
  "post",
  "/admin/users/{id}",
  "Admin-only suspension/restoration with audit",
  object({
    suspended: { type: "boolean" },
    reason: { type: "string", minLength: 5 },
  }),
);
add(
  "post",
  "/admin/reports/{id}",
  "Moderator resolution, no inventory/refund side effects",
  object({ resolution: { type: "string", minLength: 5 } }),
);
add(
  "post",
  "/admin/categories/{id}",
  "Admin-only category name/visibility update",
  object({
    name: str,
    nameBn: str,
    active: { type: "boolean" },
    reason: { type: "string", minLength: 5 },
  }),
);
const doc = {
  openapi: "3.1.0",
  info: {
    title: "ReBuild Bangladesh REST API",
    version: "0.1.0",
    description:
      "Cookie sessions issued by Better Auth at /api/auth. All cookie-authenticated mutations require the configured Origin. Standard envelope: {data,requestId}; errors: {error:{code,message,fields?},requestId}. Monetary fields use integer paisa; quantity uses whole sale increments. Read APIs never expose exact pickup details except to order participants after acceptance. Authentication API is documented separately in docs/api.md.",
  },
  servers: [
    {
      url: "http://localhost:3000/api/v1",
      description: "Local only; replace origin for deployed server",
    },
  ],
  paths,
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Production secure cookie prefix is __Secure-. Better Auth signs/manages sessions.",
      },
    },
    schemas: {
      ListingCreate: schema(listingSchema),
      WantedCreate: schema(wantedSchema),
      SearchFilters: filterJson,
      ListingPublic: {
        type: "object",
        required: ["id", "title", "price", "unit", "lot", "images", "seller"],
        properties: {
          id: str,
          title: str,
          description: str,
          categoryId: str,
          condition: str,
          price: { type: "integer", description: "Paisa per sale unit" },
          unit: { enum: ["box", "piece", "set", "pack"] },
          minimum: number,
          increment: number,
          partial: { type: "boolean" },
          area: str,
          district: str,
          pickupNotes: str,
          disclosures: str,
          brand: { type: ["string", "null"] },
          modelCode: { type: ["string", "null"] },
          batchCode: { type: ["string", "null"] },
          widthMm: { type: ["integer", "null"] },
          lengthMm: { type: ["integer", "null"] },
          piecesPerBox: { type: ["integer", "null"] },
          lot: object({ total: number, reserved: number, sold: number }),
          images: { type: "array", items: object({ id: str, alt: str }) },
          seller: object({
            id: str,
            name: str,
            sellerName: { type: ["string", "null"] },
            emailVerified: { type: "boolean" },
            createdAt: str,
          }),
          promotions: { type: "array", items: object({ expiresAt: str }) },
        },
      },
      Order: {
        type: "object",
        required: [
          "id",
          "status",
          "quantity",
          "unitPrice",
          "totalPrice",
          "titleSnapshot",
          "paymentState",
        ],
        properties: {
          id: str,
          status: {
            enum: [
              "PENDING",
              "ACCEPTED",
              "READY",
              "COMPLETED",
              "DECLINED",
              "CANCELLED",
              "EXPIRED",
            ],
          },
          quantity: number,
          unitPrice: number,
          totalPrice: number,
          titleSnapshot: str,
          unitSnapshot: str,
          pickupSnapshot: { type: ["string", "null"] },
          paymentState: { enum: ["UNCONFIRMED", "SELLER_CONFIRMED"] },
          buyerConfirmedAt: { type: ["string", "null"] },
          sellerConfirmedAt: { type: ["string", "null"] },
          reservation: { type: ["object", "null"] },
        },
      },
      Error: {
        type: "object",
        required: ["error", "requestId"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: str,
              message: str,
              fields: {
                type: "array",
                items: object({ path: str, message: str }),
              },
            },
          },
          requestId: str,
        },
      },
    },
  },
};
mkdirSync("docs", { recursive: true });
writeFileSync("docs/openapi.json", JSON.stringify(doc, null, 2) + "\n");
console.log(
  `Documented ${Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0)} REST operations.`,
);
