import { db, type Tx } from "./db";
import { assert } from "./errors";
import type { User } from "@/generated/prisma/client";

export async function lockLot(tx: Tx, listingId: string) {
  await tx.$queryRaw`SELECT id FROM "InventoryLot" WHERE "listingId" = ${listingId} FOR UPDATE`;
}
export async function notify(
  tx: Tx,
  userId: string,
  title: string,
  titleBn: string,
  href: string,
  key: string,
) {
  await tx.notification.upsert({
    where: { dedupeKey: key },
    create: { userId, title, titleBn, href, dedupeKey: key },
    update: {},
  });
}
export async function expireHolds(tx: Tx, listingId: string, now = new Date()) {
  const held = await tx.reservation.findMany({
    where: { state: "HELD", expiresAt: { lte: now }, order: { listingId } },
  });
  for (const hold of held) {
    const changed = await tx.reservation.updateMany({
      where: { id: hold.id, state: "HELD" },
      data: { state: "EXPIRED" },
    });
    if (!changed.count) continue;
    await tx.inventoryLot.update({
      where: { listingId },
      data: {
        reserved: { decrement: hold.quantity },
        version: { increment: 1 },
      },
    });
    const order = await tx.order.update({
      where: { id: hold.orderId },
      data: { status: "EXPIRED" },
    });
    for (const id of [order.buyerId, order.sellerId])
      await notify(
        tx,
        id,
        "Pickup reservation expired",
        "পিকআপ সংরক্ষণের সময় শেষ",
        `/orders/${order.id}`,
        `expire:${order.id}:${id}`,
      );
  }
}
function active(user: User) {
  assert(!user.suspended, "SUSPENDED", 403);
  assert(user.emailVerified, "VERIFIED_REQUIRED", 403);
}
export async function requestPurchase(
  user: User,
  listingId: string,
  quantity: number,
  key: string,
) {
  active(user);
  assert(key.length >= 8 && key.length <= 100, "IDEMPOTENCY");
  return db.$transaction(async (tx) => {
    await lockLot(tx, listingId);
    await expireHolds(tx, listingId);
    const previous = await tx.order.findUnique({
      where: { buyerId_requestKey: { buyerId: user.id, requestKey: key } },
    });
    if (previous) {
      assert(
        previous.listingId === listingId && previous.quantity === quantity,
        "IDEMPOTENCY",
        409,
      );
      return previous;
    }
    const l = await tx.listing.findUnique({
      where: { id: listingId },
      include: { lot: true, seller: true },
    });
    assert(
      l?.lot && l.status === "APPROVED" && !l.seller.suspended,
      "NOT_FOUND",
      404,
    );
    assert(l.sellerId !== user.id, "SELF_PURCHASE");
    const available = l.lot.total - l.lot.sold - l.lot.reserved;
    assert(
      Number.isInteger(quantity) &&
        quantity >= l.minimum &&
        quantity % l.increment === 0 &&
        (l.partial || quantity === available),
      "QUANTITY",
    );
    assert(quantity <= available, "STOCK", 409);
    const existing = await tx.order.findFirst({
      where: { buyerId: user.id, listingId, status: "PENDING" },
    });
    assert(!existing, "STATE", 409);
    const o = await tx.order.create({
      data: {
        buyerId: user.id,
        sellerId: l.sellerId,
        listingId,
        quantity,
        unitPrice: l.price,
        totalPrice: quantity * l.price,
        titleSnapshot: l.title,
        unitSnapshot: l.unit,
        requestKey: key,
      },
    });
    await notify(
      tx,
      l.sellerId,
      "New purchase request",
      "নতুন ক্রয় অনুরোধ",
      `/orders/${o.id}`,
      `request:${o.id}`,
    );
    return o;
  });
}
export async function changeOrder(user: User, orderId: string, action: string) {
  active(user);
  const initial = await db.order.findUnique({ where: { id: orderId } });
  assert(
    initial && [initial.buyerId, initial.sellerId].includes(user.id),
    "NOT_FOUND",
    404,
  );
  return db.$transaction(async (tx) => {
    await lockLot(tx, initial.listingId);
    await expireHolds(tx, initial.listingId);
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        reservation: true,
        listing: { include: { lot: true, seller: true } },
        buyer: true,
      },
    });
    const seller = user.id === order.sellerId;
    if (action === "accept") {
      assert(seller, "FORBIDDEN", 403);
      if (["ACCEPTED", "READY", "COMPLETED"].includes(order.status))
        return order;
      assert(
        order.status === "PENDING" &&
          order.listing.status === "APPROVED" &&
          !order.buyer.suspended,
        "STATE",
        409,
      );
      assert(order.unitPrice === order.listing.price, "PRICE_CHANGED", 409);
      const lot = order.listing.lot!;
      const available = lot.total - lot.reserved - lot.sold;
      assert(
        order.quantity >= order.listing.minimum &&
          order.quantity % order.listing.increment === 0 &&
          (order.listing.partial || order.quantity === available),
        "QUANTITY",
        409,
      );
      assert(order.quantity <= available, "STOCK", 409);
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          reserved: { increment: order.quantity },
          version: { increment: 1 },
        },
      });
      await tx.reservation.create({
        data: {
          orderId,
          quantity: order.quantity,
          expiresAt: new Date(
            Date.now() + Number(process.env.RESERVATION_HOURS || 24) * 3600000,
          ),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "ACCEPTED",
          pickupSnapshot:
            order.listing.privatePickup + "\n" + order.listing.pickupNotes,
        },
      });
    } else if (action === "decline" || action === "cancel") {
      const terminal = action === "decline" ? "DECLINED" : "CANCELLED";
      if (action === "decline") assert(seller, "FORBIDDEN", 403);
      if (order.status === terminal) return order;
      assert(
        action === "decline"
          ? order.status === "PENDING"
          : ["PENDING", "ACCEPTED", "READY"].includes(order.status) &&
              !order.buyerConfirmedAt &&
              !order.sellerConfirmedAt,
        "STATE",
        409,
      );
      if (order.reservation?.state === "HELD") {
        await tx.reservation.update({
          where: { orderId },
          data: { state: "RELEASED" },
        });
        await tx.inventoryLot.update({
          where: { listingId: order.listingId },
          data: {
            reserved: { decrement: order.quantity },
            version: { increment: 1 },
          },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: terminal },
      });
    } else if (action === "ready") {
      assert(seller, "FORBIDDEN", 403);
      if (order.status === "READY") return order;
      assert(order.status === "ACCEPTED", "STATE", 409);
      await tx.order.update({
        where: { id: orderId },
        data: { status: "READY" },
      });
    } else if (action === "handover") {
      if (order.status === "COMPLETED") return order;
      assert(
        order.status === "READY" && order.reservation?.state === "HELD",
        "STATE",
        409,
      );
      const updated = await tx.order.update({
        where: { id: orderId },
        data: seller
          ? { sellerConfirmedAt: order.sellerConfirmedAt ?? new Date() }
          : { buyerConfirmedAt: order.buyerConfirmedAt ?? new Date() },
      });
      if (updated.buyerConfirmedAt && updated.sellerConfirmedAt) {
        await tx.reservation.update({
          where: { orderId },
          data: { state: "CONSUMED" },
        });
        await tx.inventoryLot.update({
          where: { listingId: order.listingId },
          data: {
            reserved: { decrement: order.quantity },
            sold: { increment: order.quantity },
            version: { increment: 1 },
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: "COMPLETED" },
        });
      }
    } else if (action === "payment-received") {
      assert(
        seller && ["READY", "COMPLETED"].includes(order.status),
        "STATE",
        409,
      );
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentState: "SELLER_CONFIRMED",
          paymentConfirmedAt: order.paymentConfirmedAt ?? new Date(),
        },
      });
    } else assert(false, "INVALID_INPUT");
    const result = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { reservation: true },
    });
    for (const id of [order.buyerId, order.sellerId])
      await notify(
        tx,
        id,
        `Order ${result.status.toLowerCase()}`,
        "অর্ডারের অবস্থা পরিবর্তন হয়েছে",
        `/orders/${orderId}`,
        `order:${orderId}:${action}:${id}`,
      );
    return result;
  });
}
export async function expireReservations() {
  const holds = await db.reservation.findMany({
    where: { state: "HELD", expiresAt: { lte: new Date() } },
    select: { order: { select: { listingId: true } } },
    take: 200,
  });
  for (const listingId of new Set(holds.map((h) => h.order.listingId)))
    await db.$transaction(async (tx) => {
      await lockLot(tx, listingId);
      await expireHolds(tx, listingId);
    });
}
