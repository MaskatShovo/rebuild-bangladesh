import { db } from "./db";
import { Prisma, type User } from "@/generated/prisma/client";
import { assert } from "./errors";
import { listingSchema, normalize, searchSchema } from "./validation";
import { expireHolds, lockLot, expireReservations } from "./orders";
export const publicListing = {
  id: true,
  title: true,
  description: true,
  categoryId: true,
  category: { select: { name: true, nameBn: true } },
  condition: true,
  price: true,
  unit: true,
  minimum: true,
  increment: true,
  partial: true,
  area: true,
  district: true,
  pickupNotes: true,
  disclosures: true,
  brand: true,
  modelCode: true,
  batchCode: true,
  widthMm: true,
  lengthMm: true,
  thicknessMm: true,
  weightGrams: true,
  finish: true,
  colour: true,
  piecesPerBox: true,
  material: true,
  publishedAt: true,
  lot: { select: { total: true, reserved: true, sold: true } },
  images: {
    select: { id: true, alt: true },
    orderBy: { createdAt: "asc" as const },
  },
  seller: {
    select: {
      id: true,
      name: true,
      sellerName: true,
      emailVerified: true,
      createdAt: true,
    },
  },
  promotions: {
    where: { active: true, expiresAt: { gt: new Date() } },
    select: { expiresAt: true },
  },
} satisfies Prisma.ListingSelect;
export type PublicListing = Prisma.ListingGetPayload<{
  select: typeof publicListing;
}>;
export async function searchListings(input: unknown) {
  const f = searchSchema.parse(input);
  await expireReservations();
  const where: Prisma.ListingWhereInput = {
    status: "APPROVED",
    seller: { suspended: false },
    category: { active: true },
    price: { gte: Math.round(f.min * 100), lte: Math.round(f.max * 100) },
  };
  if (f.q) {
    const q = normalize(f.q);
    const rows = await db.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "Listing" WHERE "searchText" ILIKE ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"} OR similarity("searchText", ${q}) > 0.12 OR word_similarity(${q}, "searchText") > 0.4`;
    where.id = { in: rows.map((r) => r.id) };
  }
  if (f.category) where.categoryId = f.category;
  if (f.area) where.area = { contains: f.area, mode: "insensitive" };
  if (f.condition) where.condition = f.condition;
  if (f.brand) where.brand = { contains: f.brand, mode: "insensitive" };
  if (f.model) where.modelCode = { contains: f.model, mode: "insensitive" };
  if (f.finish) where.finish = { contains: f.finish, mode: "insensitive" };
  if (f.partial) where.partial = true;
  if (f.width) where.widthMm = f.width;
  if (f.length) where.lengthMm = f.length;
  if (f.quantity) {
    const ids = await db.$queryRaw<
      { listingId: string }[]
    >`SELECT "listingId" FROM "InventoryLot" WHERE total - reserved - sold >= ${f.quantity}`;
    where.AND = [{ id: { in: ids.map((i) => i.listingId) } }];
  }
  const [items, total] = await Promise.all([
    db.listing.findMany({
      where,
      select: {
        ...publicListing,
        promotions: {
          where: { active: true, expiresAt: { gt: new Date() } },
          select: { expiresAt: true },
        },
      },
      orderBy:
        f.sort === "recent"
          ? [{ publishedAt: "desc" }, { id: "asc" }]
          : [{ price: f.sort === "price-low" ? "asc" : "desc" }, { id: "asc" }],
      skip: (f.page - 1) * 12,
      take: 12,
    }),
    db.listing.count({ where }),
  ]);
  return {
    items,
    total,
    page: f.page,
    pages: Math.ceil(total / 12),
    filters: f,
  };
}
export async function getListing(id: string) {
  await db.$transaction(async (tx) => {
    await lockLot(tx, id);
    await expireHolds(tx, id);
  });
  return db.listing.findFirst({
    where: {
      id,
      status: "APPROVED",
      seller: { suspended: false },
      category: { active: true },
    },
    select: {
      ...publicListing,
      promotions: {
        where: { active: true, expiresAt: { gt: new Date() } },
        select: { expiresAt: true },
      },
    },
  });
}
export async function saveListing(user: User, input: unknown, id?: string) {
  assert(
    user.emailVerified && user.sellerName && !user.suspended,
    "VERIFIED_REQUIRED",
    403,
  );
  const data = listingSchema.parse(input);
  const { total, imageIds, ...fields } = data;
  return db.$transaction(async (tx) => {
    if (id) {
      await lockLot(tx, id);
      await expireHolds(tx, id);
    }
    const old = id
      ? await tx.listing.findUnique({ where: { id }, include: { lot: true } })
      : null;
    if (id) assert(old?.sellerId === user.id, "NOT_FOUND", 404);
    assert(!old || total >= old.lot!.sold + old.lot!.reserved, "STOCK", 409);
    const category = await tx.category.findUnique({
      where: { id: data.categoryId },
    });
    assert(category?.active, "INVALID_INPUT");
    const images = await tx.upload.findMany({
      where: {
        id: { in: imageIds },
        ownerId: user.id,
        OR: [{ listingId: null }, ...(id ? [{ listingId: id }] : [])],
      },
    });
    assert(images.length === new Set(imageIds).size, "FORBIDDEN", 403);
    const searchText = normalize(
      [
        data.title,
        data.description,
        data.brand,
        data.modelCode,
        data.batchCode,
        data.colour,
        data.area,
        data.categoryId,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const l = id
      ? await tx.listing.update({
          where: { id },
          data: {
            ...fields,
            searchText,
            status: old!.status === "DRAFT" ? "DRAFT" : "PENDING",
            moderationReason: null,
            lot: { update: { total } },
          },
        })
      : await tx.listing.create({
          data: {
            ...fields,
            searchText,
            sellerId: user.id,
            lot: { create: { total } },
          },
        });
    await tx.upload.updateMany({
      where: { listingId: l.id, id: { notIn: imageIds } },
      data: { listingId: null },
    });
    await tx.upload.updateMany({
      where: { id: { in: imageIds } },
      data: { listingId: l.id },
    });
    return l;
  });
}
export async function listingAction(
  user: User,
  id: string,
  action: string,
  reason = "",
) {
  return db.$transaction(async (tx) => {
    await lockLot(tx, id);
    const l = await tx.listing.findUnique({
      where: { id },
      include: { images: true },
    });
    assert(l, "NOT_FOUND", 404);
    let status = "";
    if (["approve", "reject"].includes(action)) {
      assert(["ADMIN", "MODERATOR"].includes(user.role), "FORBIDDEN", 403);
      assert(reason.trim().length >= 5, "INVALID_INPUT");
      assert(l.status === "PENDING" || action === "reject", "STATE", 409);
      status = action === "approve" ? "APPROVED" : "REJECTED";
      if (action === "approve") assert(l.images.length > 0, "IMAGES_REQUIRED");
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: `listing:${action}`,
          targetId: id,
          reason,
        },
      });
    } else {
      assert(l.sellerId === user.id, "FORBIDDEN", 403);
      if (action === "publish") {
        assert(l.images.length > 0, "IMAGES_REQUIRED");
        status = "PENDING";
      }
      if (action === "pause") status = "PAUSED";
      if (action === "archive") status = "ARCHIVED";
    }
    assert(status, "INVALID_INPUT");
    const result = await tx.listing.update({
      where: { id },
      data: {
        status,
        moderationReason: reason || null,
        ...(status === "APPROVED" ? { publishedAt: new Date() } : {}),
      },
    });
    if (status === "APPROVED")
      await tx.outbox.upsert({
        where: { dedupeKey: `published:${id}` },
        create: {
          kind: "LISTING_PUBLISHED",
          payload: { listingId: id },
          dedupeKey: `published:${id}`,
        },
        update: {},
      });
    return result;
  });
}
