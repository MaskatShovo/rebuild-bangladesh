import { db } from "./db";
import { assert } from "./errors";
import { publicListing } from "./listings";
import type { User } from "@/generated/prisma/client";
export async function checkParticipants(user: User, id: string) {
  const c = await db.conversation.findUnique({ where: { id } });
  assert(c && [c.buyerId, c.sellerId].includes(user.id), "NOT_FOUND", 404);
  return c;
}
export async function sendMessage(user: User, id: string, body: string) {
  const c = await checkParticipants(user, id);
  const targetId = c.buyerId === user.id ? c.sellerId : c.buyerId;
  const target = await db.user.findUnique({ where: { id: targetId } });
  assert(!target?.suspended, "BLOCKED", 403);
  const block = await db.block.findFirst({
    where: {
      OR: [
        { userId: user.id, targetId },
        { userId: targetId, targetId: user.id },
      ],
    },
  });
  assert(!block, "BLOCKED", 403);
  return db.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: { conversationId: id, senderId: user.id, body },
    });
    await tx.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: targetId,
        title: "You have a new message",
        titleBn: "আপনার নতুন বার্তা এসেছে",
        href: `/messages/${id}`,
        dedupeKey: `message:${m.id}`,
      },
    });
    return m;
  });
}
export async function wantedMatches(id: string) {
  const w = await db.wanted.findUnique({ where: { id } });
  assert(w, "NOT_FOUND", 404);
  const candidates = await db.listing.findMany({
    where: {
      status: "APPROVED",
      categoryId: w.categoryId,
      seller: { suspended: false },
      category: { active: true },
    },
    select: publicListing,
    take: 40,
  });
  return candidates
    .map((l) => ({
      listing: l,
      matches: [
        l.categoryId === w.categoryId ? "category" : null,
        l.area === w.area ? "area" : null,
        l.modelCode &&
        w.modelCode &&
        l.modelCode.toLowerCase() === w.modelCode.toLowerCase()
          ? "model"
          : null,
        l.widthMm && l.widthMm === w.widthMm ? "width" : null,
        l.lengthMm && l.lengthMm === w.lengthMm ? "length" : null,
        l.unit === w.unit &&
        l.lot &&
        l.lot.total - l.lot.reserved - l.lot.sold >= w.quantity
          ? "quantity and unit"
          : null,
      ].filter(Boolean),
      unknown: [
        !l.modelCode ? "model" : null,
        !l.batchCode ? "batch/shade" : null,
        w.widthMm && !l.widthMm ? "width" : null,
        w.lengthMm && !l.lengthMm ? "length" : null,
      ].filter(Boolean),
      mismatches: [
        w.modelCode &&
        l.modelCode &&
        w.modelCode.toLowerCase() !== l.modelCode.toLowerCase()
          ? "model"
          : null,
        w.widthMm && l.widthMm && w.widthMm !== l.widthMm ? "width" : null,
        w.lengthMm && l.lengthMm && w.lengthMm !== l.lengthMm ? "length" : null,
        w.unit !== l.unit ? "selling unit" : null,
      ].filter(Boolean),
    }))
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, 6);
}
export async function dashboard(user: User) {
  const [
    listings,
    orders,
    saves,
    searches,
    notifications,
    conversations,
    wanted,
    payments,
  ] = await Promise.all([
    db.listing.findMany({
      where: { sellerId: user.id },
      include: { lot: true, images: { select: { id: true, alt: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.order.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: { reservation: true, review: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.savedListing.findMany({
      where: {
        userId: user.id,
        listing: { status: "APPROVED", seller: { suspended: false } },
      },
      select: { listing: { select: publicListing } },
      take: 100,
    }),
    db.savedSearch.findMany({ where: { userId: user.id }, take: 100 }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.conversation.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      include: {
        listing: { select: { title: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.wanted.findMany({ where: { userId: user.id }, take: 100 }),
    db.paymentAttempt.findMany({
      where: { userId: user.id },
      include: { promotion: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);
  return {
    capabilities: {
      paymentSimulator:
        process.env.NODE_ENV !== "production" &&
        process.env.PAYMENT_SIMULATOR === "true",
      promotionPayments:
        (process.env.NODE_ENV !== "production" &&
          process.env.PAYMENT_SIMULATOR === "true") ||
        Boolean(
          process.env.SSLCOMMERZ_SANDBOX === "true" &&
          process.env.SSLCOMMERZ_STORE_ID &&
          process.env.SSLCOMMERZ_STORE_PASSWORD,
        ),
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      locale: user.locale,
      phone: user.phone,
      sellerName: user.sellerName,
      bio: user.bio,
      area: user.area,
      emailAlerts: user.emailAlerts,
    },
    listings,
    orders,
    saves: saves.map((s) => s.listing),
    searches,
    notifications,
    conversations,
    wanted,
    payments,
  };
}
