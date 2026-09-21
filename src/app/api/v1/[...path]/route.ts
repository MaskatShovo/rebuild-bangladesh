import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db } from "@/lib/db";
import { currentUser, requireUser, requireRole } from "@/lib/auth";
import { AppError, assert, messageFor } from "@/lib/errors";
import {
  searchListings,
  getListing,
  saveListing,
  listingAction,
  publicListing,
} from "@/lib/listings";
import { requestPurchase, changeOrder } from "@/lib/orders";
import {
  dashboard,
  checkParticipants,
  sendMessage,
  wantedMatches,
} from "@/lib/marketplace";
import { wantedSchema, searchSchema, normalizePhone } from "@/lib/validation";
import { putImage, imageBytes } from "@/lib/storage";
import {
  createPromotionPayment,
  applyPaymentEvent,
  simulatorEnabled,
  SslCommerzSandbox,
} from "@/lib/payments";

type Context = { params: Promise<{ path: string[] }> };
const idInput = z.string().min(1).max(100);
const pagination = (req: NextRequest) =>
  z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(req.nextUrl.searchParams.get("page") || 1);
async function json(req: NextRequest) {
  assert(
    Number(req.headers.get("content-length") || 0) < 65536,
    "INVALID_INPUT",
    413,
  );
  const body = await req.text();
  assert(body.length < 65536, "INVALID_INPUT", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError("INVALID_INPUT");
  }
}
async function handle(req: NextRequest, context: Context) {
  const requestId = crypto.randomUUID(),
    locale = req.cookies.get("locale")?.value || "en";
  const ok = (data: unknown, status = 200) =>
    NextResponse.json(
      { data, requestId },
      {
        status,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Request-ID": requestId,
        },
      },
    );
  try {
    const { path } = await context.params;
    const [resource, id, action] = path;
    const method = req.method;
    if (path.length > 3) throw new AppError("NOT_FOUND", 404);
    // Provider callbacks are not browser-authenticated mutations. Only server-validated IPNs can activate a promotion.
    if (
      resource === "payments" &&
      id === "return" &&
      ["GET", "POST"].includes(method)
    )
      return NextResponse.redirect(
        new URL("/dashboard/promotions", process.env.BETTER_AUTH_URL!),
        303,
      );
    if (resource === "payments" && id === "ssl-ipn" && method === "POST") {
      assert(
        process.env.SSLCOMMERZ_STORE_ID &&
          process.env.SSLCOMMERZ_STORE_PASSWORD &&
          process.env.SSLCOMMERZ_SANDBOX === "true",
        "PROVIDER_UNAVAILABLE",
        503,
      );
      assert(
        Number(req.headers.get("content-length") || 0) < 8192,
        "INVALID_INPUT",
        413,
      );
      const form = await req.formData();
      const valId = z.string().min(1).max(100).parse(form.get("val_id"));
      const event = await new SslCommerzSandbox().verify({ val_id: valId });
      await applyPaymentEvent(event, "sslcommerz");
      return ok({ received: true });
    }
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      assert(
        origin === new URL(process.env.BETTER_AUTH_URL!).origin,
        "CSRF",
        403,
      );
    }
    if (resource === "health" && method === "GET") {
      await db.$queryRaw`SELECT 1`;
      return ok({ status: "ready" });
    }
    if (resource === "categories" && method === "GET")
      return ok(await db.category.findMany({ where: { active: true } }));
    if (resource === "listings" && method === "GET")
      return ok(
        id
          ? await getListing(id).then((v) => {
              assert(v, "NOT_FOUND", 404);
              return v;
            })
          : await searchListings(Object.fromEntries(req.nextUrl.searchParams)),
      );
    if (resource === "wanted" && method === "GET") {
      if (id && action === "matches") return ok(await wantedMatches(id));
      const page = pagination(req);
      return ok(
        await db.wanted.findMany({
          where: {
            ...(id ? { id } : {}),
            closed: false,
            user: { suspended: false },
          },
          include: {
            user: { select: { id: true, name: true } },
            responses: {
              where: {
                listing: {
                  status: "APPROVED",
                  seller: { suspended: false },
                  category: { active: true },
                },
              },
              select: { id: true, listing: { select: publicListing } },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 20,
          take: 20,
        }),
      );
    }
    if (resource === "sellers" && id && method === "GET") {
      const seller = await db.user.findFirst({
        where: { id, suspended: false, sellerName: { not: null } },
        select: {
          id: true,
          name: true,
          sellerName: true,
          bio: true,
          area: true,
          createdAt: true,
          emailVerified: true,
        },
      });
      assert(seller, "NOT_FOUND", 404);
      const [listings, reviews] = await Promise.all([
        db.listing.findMany({
          where: { sellerId: id, status: "APPROVED" },
          select: publicListing,
          take: 100,
        }),
        db.review.findMany({
          where: { order: { sellerId: id } },
          include: { author: { select: { name: true } } },
          take: 50,
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return ok({ seller, listings, reviews });
    }
    if (resource === "media" && id && method === "GET") {
      const upload = await db.upload.findUnique({
        where: { id },
        include: {
          listing: { include: { seller: { select: { suspended: true } } } },
        },
      });
      assert(upload, "NOT_FOUND", 404);
      const visible =
        upload.listing?.status === "APPROVED" &&
        !upload.listing.seller.suspended;
      if (!visible) {
        const user = await requireUser(req.headers);
        assert(
          user.id === upload.ownerId ||
            ["ADMIN", "MODERATOR"].includes(user.role),
          "NOT_FOUND",
          404,
        );
      }
      const bytes = await imageBytes(
        req.nextUrl.searchParams.get("full") === "1"
          ? upload.objectKey
          : upload.thumbnailKey,
      );
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=60",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (resource === "session" && method === "GET") {
      const user = await currentUser(req.headers);
      return ok(
        user && !user.suspended
          ? {
              id: user.id,
              name: user.name,
              emailVerified: user.emailVerified,
              role: user.role,
              sellerName: user.sellerName,
            }
          : null,
      );
    }
    const user = await requireUser(req.headers, method !== "GET");
    if (method !== "GET") {
      const key = `api:${user.id}:${resource}:${Math.floor(Date.now() / 60000)}`;
      const rate = await db.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, lastRequest: BigInt(Date.now()) },
        update: { count: { increment: 1 }, lastRequest: BigInt(Date.now()) },
      });
      assert(rate.count <= 60, "RATE_LIMIT", 429);
    }
    if (resource === "me") {
      if (method === "GET") return ok(await dashboard(user));
      if (method === "PATCH") {
        const fields = z
          .object({
            name: z.string().trim().min(2).max(80),
            sellerName: z.string().trim().min(2).max(80).nullable().optional(),
            bio: z.string().max(1000).nullable().optional(),
            area: z.string().min(2).max(80),
            phone: z.string().max(30).optional(),
            locale: z.enum(["en", "bn"]),
            emailAlerts: z.boolean(),
          })
          .parse(await json(req));
        const phone = fields.phone ? normalizePhone(fields.phone) : null;
        assert(!fields.phone || phone, "INVALID_INPUT");
        await db.user.update({
          where: { id: user.id },
          data: { ...fields, phone },
        });
        return ok({ updated: true });
      }
    }
    if (resource === "listings") {
      if (method === "POST" && !id)
        return ok(await saveListing(user, await json(req)), 201);
      if (method === "PUT" && id)
        return ok(await saveListing(user, await json(req), id));
      if (method === "POST" && id && action) {
        const input = z
          .object({ reason: z.string().max(1000).optional() })
          .parse(await json(req));
        return ok(await listingAction(user, id, action, input.reason));
      }
    }
    if (resource === "uploads" && method === "POST") {
      assert(
        Number(req.headers.get("content-length") || 0) <= 9 * 1024 * 1024,
        "UPLOAD",
        413,
      );
      const form = await req.formData(),
        file = form.get("file");
      assert(
        file instanceof File && file.size <= 8 * 1024 * 1024,
        "UPLOAD",
        413,
      );
      const count = await db.upload.count({
        where: { ownerId: user.id, listingId: null },
      });
      assert(count < 24, "UPLOAD");
      return ok(
        await putImage(
          user.id,
          Buffer.from(await file.arrayBuffer()),
          String(form.get("alt") || "Material photograph"),
        ),
        201,
      );
    }
    if (resource === "orders") {
      if (method === "GET") {
        const page = pagination(req);
        const where = {
          ...(id ? { id } : {}),
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
        };
        const orders = await db.order.findMany({
          where,
          include: {
            reservation: true,
            review: true,
            buyer: { select: { id: true, name: true } },
            seller: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 20,
          take: 20,
        });
        if (id) {
          assert(orders[0], "NOT_FOUND", 404);
          return ok(orders[0]);
        }
        return ok(orders);
      }
      if (method === "POST" && !id) {
        const b = z
          .object({
            listingId: idInput,
            quantity: z.number().int().positive().max(100000),
          })
          .parse(await json(req));
        return ok(
          await requestPurchase(
            user,
            b.listingId,
            b.quantity,
            req.headers.get("idempotency-key") || "",
          ),
          201,
        );
      }
      if (method === "POST" && id && action === "review") {
        const b = z
          .object({
            rating: z.number().int().min(1).max(5),
            body: z.string().trim().min(5).max(2000),
          })
          .parse(await json(req));
        const o = await db.order.findUnique({ where: { id } });
        assert(
          o?.buyerId === user.id &&
            o.status === "COMPLETED" &&
            o.sellerId !== user.id,
          "FORBIDDEN",
          403,
        );
        return ok(
          await db.review.upsert({
            where: { orderId: id },
            create: { orderId: id, authorId: user.id, ...b },
            update: {},
          }),
          201,
        );
      }
      if (method === "POST" && id && action)
        return ok(await changeOrder(user, id, action));
    }
    if (resource === "saved") {
      assert(id, "INVALID_INPUT");
      if (method === "POST") {
        assert(await getListing(id), "NOT_FOUND", 404);
        return ok(
          await db.savedListing.upsert({
            where: { userId_listingId: { userId: user.id, listingId: id } },
            create: { userId: user.id, listingId: id },
            update: {},
          }),
          201,
        );
      }
      if (method === "DELETE") {
        await db.savedListing.deleteMany({
          where: { userId: user.id, listingId: id },
        });
        return ok({ removed: true });
      }
    }
    if (resource === "searches") {
      if (method === "POST") {
        const b = z
          .object({ label: z.string().min(2).max(80), filters: searchSchema })
          .parse(await json(req));
        return ok(
          await db.savedSearch.create({
            data: { userId: user.id, label: b.label, filters: b.filters },
          }),
          201,
        );
      }
      if (method === "DELETE" && id) {
        await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
        return ok({ removed: true });
      }
    }
    if (resource === "wanted") {
      if (method === "POST" && !id) {
        const b = wantedSchema.parse(await json(req));
        return ok(
          await db.wanted.create({ data: { ...b, userId: user.id } }),
          201,
        );
      }
      if (method === "POST" && id && action === "respond") {
        const b = z.object({ listingId: idInput }).parse(await json(req));
        const l = await getListing(b.listingId);
        const w = await db.wanted.findUnique({ where: { id } });
        assert(
          l?.seller.id === user.id &&
            w &&
            !w.closed &&
            w.userId !== user.id &&
            l.categoryId === w.categoryId,
          "FORBIDDEN",
          403,
        );
        return ok(
          await db.wantedResponse.upsert({
            where: {
              wantedId_listingId: { wantedId: id, listingId: b.listingId },
            },
            create: { wantedId: id, listingId: b.listingId },
            update: {},
          }),
          201,
        );
      }
      if (method === "DELETE" && id) {
        const result = await db.wanted.updateMany({
          where: { id, userId: user.id },
          data: { closed: true },
        });
        assert(result.count, "NOT_FOUND", 404);
        return ok({ closed: true });
      }
    }
    if (resource === "conversations") {
      if (method === "POST" && !id) {
        const b = z
          .object({
            listingId: idInput,
            body: z.string().trim().min(1).max(2000),
          })
          .parse(await json(req));
        const l = await getListing(b.listingId);
        assert(l && l.seller.id !== user.id, "FORBIDDEN", 403);
        const c = await db.conversation.upsert({
          where: {
            buyerId_listingId: { buyerId: user.id, listingId: b.listingId },
          },
          create: {
            buyerId: user.id,
            sellerId: l.seller.id,
            listingId: b.listingId,
          },
          update: {},
        });
        await sendMessage(user, c.id, b.body);
        return ok(c, 201);
      }
      if (id) {
        const c = await checkParticipants(user, id);
        if (method === "GET") {
          const page = pagination(req);
          const messages = await db.message.findMany({
            where: { conversationId: id },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * 30,
            take: 30,
          });
          await db.conversation.update({
            where: { id },
            data:
              c.buyerId === user.id
                ? { buyerReadAt: new Date() }
                : { sellerReadAt: new Date() },
          });
          return ok({ conversation: c, messages: messages.reverse(), page });
        }
        if (method === "POST") {
          const b = z
            .object({ body: z.string().trim().min(1).max(2000) })
            .parse(await json(req));
          return ok(await sendMessage(user, id, b.body), 201);
        }
      }
    }
    if (resource === "blocks" && id) {
      assert(id !== user.id, "INVALID_INPUT");
      if (method === "POST")
        return ok(
          await db.block.upsert({
            where: { userId_targetId: { userId: user.id, targetId: id } },
            create: { userId: user.id, targetId: id },
            update: {},
          }),
        );
      if (method === "DELETE") {
        await db.block.deleteMany({ where: { userId: user.id, targetId: id } });
        return ok({ removed: true });
      }
    }
    if (resource === "notifications" && method === "POST") {
      await db.notification.updateMany({
        where: { userId: user.id, ...(id ? { id } : {}) },
        data: { readAt: new Date() },
      });
      return ok({ read: true });
    }
    if (resource === "reports" && method === "POST") {
      const b = z
        .object({
          targetType: z.enum(["LISTING", "USER", "CONVERSATION", "ORDER"]),
          targetId: idInput,
          reason: z.string().trim().min(10).max(2000),
        })
        .parse(await json(req));
      if (b.targetType === "ORDER") {
        const o = await db.order.findUnique({ where: { id: b.targetId } });
        assert(
          o && [o.buyerId, o.sellerId].includes(user.id),
          "NOT_FOUND",
          404,
        );
      }
      if (b.targetType === "CONVERSATION")
        await checkParticipants(user, b.targetId);
      return ok(
        await db.report.create({
          data: {
            ...b,
            authorId: user.id,
            ...(b.targetType === "ORDER" ? { orderId: b.targetId } : {}),
          },
        }),
        201,
      );
    }
    if (resource === "payments") {
      if (method === "POST" && !id) {
        const b = z.object({ listingId: idInput }).parse(await json(req));
        const key = req.headers.get("idempotency-key") || "";
        assert(key.length >= 8 && key.length <= 100, "IDEMPOTENCY");
        return ok(await createPromotionPayment(user, b.listingId, key), 201);
      }
      if (method === "POST" && id && action === "simulate") {
        assert(simulatorEnabled(), "NOT_FOUND", 404);
        const p = await db.paymentAttempt.findUnique({ where: { id } });
        assert(p?.userId === user.id, "NOT_FOUND", 404);
        const b = z
          .object({
            state: z.enum(["SUCCESS", "FAILED", "CANCELLED", "REFUNDED"]),
            eventId: z.string().min(8).max(100),
          })
          .parse(await json(req));
        return ok(
          await applyPaymentEvent(
            {
              transactionId: id,
              eventId: `sim:${b.eventId}`,
              amount: p.amount,
              currency: p.currency,
              state: b.state,
            },
            "simulator",
          ),
        );
      }
    }
    if (resource === "admin") {
      requireRole(user);
      if (method === "GET") {
        const [
          listings,
          reports,
          users,
          audit,
          jobs,
          completed,
          active,
          volume,
        ] = await Promise.all([
          db.listing.findMany({
            where: { status: "PENDING" },
            include: {
              images: { select: { id: true, alt: true } },
              seller: { select: { name: true } },
            },
            take: 100,
          }),
          db.report.findMany({ where: { status: "OPEN" }, take: 100 }),
          db.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              suspended: true,
            },
            take: 100,
          }),
          db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
          db.outbox.findMany({
            select: {
              id: true,
              kind: true,
              attempts: true,
              processedAt: true,
              lastError: true,
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
          db.order.count({ where: { status: "COMPLETED" } }),
          db.listing.count({ where: { status: "APPROVED" } }),
          db.order.aggregate({
            where: { status: "COMPLETED" },
            _sum: { totalPrice: true },
          }),
        ]);
        return ok({
          listings,
          reports,
          users,
          audit,
          jobs,
          metrics: {
            completed,
            active,
            completedOrderValue: volume._sum.totalPrice || 0,
            materialFundsCollected: 0,
          },
        });
      }
      if (method === "POST" && id === "users" && action) {
        requireRole(user, true);
        const b = z
          .object({
            suspended: z.boolean(),
            reason: z.string().min(5).max(1000),
          })
          .parse(await json(req));
        assert(action !== user.id, "FORBIDDEN", 403);
        await db.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: action },
            data: { suspended: b.suspended },
          });
          if (b.suspended)
            await tx.session.deleteMany({ where: { userId: action } });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "user:suspension",
              targetId: action,
              reason: b.reason,
            },
          });
        });
        return ok({ updated: true });
      }
      if (method === "POST" && id === "reports" && action) {
        const b = z
          .object({ resolution: z.string().min(5).max(1000) })
          .parse(await json(req));
        await db.$transaction(async (tx) => {
          await tx.report.update({
            where: { id: action },
            data: { status: "RESOLVED", resolution: b.resolution },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "report:resolve",
              targetId: action,
              reason: b.resolution,
            },
          });
        });
        return ok({ resolved: true });
      }
      if (method === "POST" && id === "categories" && action) {
        requireRole(user, true);
        const b = z
          .object({
            name: z.string().min(2).max(80),
            nameBn: z.string().min(2).max(80),
            active: z.boolean(),
            reason: z.string().min(5).max(1000),
          })
          .parse(await json(req));
        await db.$transaction(async (tx) => {
          await tx.category.update({
            where: { id: action },
            data: { name: b.name, nameBn: b.nameBn, active: b.active },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "category:update",
              targetId: action,
              reason: b.reason,
            },
          });
        });
        return ok({ updated: true });
      }
    }
    throw new AppError("NOT_FOUND", 404);
  } catch (error) {
    const validation = error instanceof ZodError;
    const known = error instanceof AppError;
    const code = validation ? "INVALID_INPUT" : known ? error.code : "INTERNAL",
      status = validation ? 422 : known ? error.status : 500;
    console.error(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        code,
        status,
        ...(process.env.NODE_ENV !== "production" && !known && !validation
          ? { detail: String(error) }
          : {}),
      }),
    );
    return NextResponse.json(
      {
        error: {
          code,
          message: messageFor(code, locale),
          ...(validation
            ? {
                fields: error.issues.map((i) => ({
                  path: i.path.join("."),
                  message: messageFor("INVALID_INPUT", locale),
                })),
              }
            : {}),
        },
        requestId,
      },
      {
        status,
        headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
      },
    );
  }
}
export const GET = handle,
  POST = handle,
  PUT = handle,
  PATCH = handle,
  DELETE = handle;
