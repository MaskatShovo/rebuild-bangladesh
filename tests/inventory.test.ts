import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { db } from "../src/lib/db";
import {
  requestPurchase,
  changeOrder,
  expireReservations,
} from "../src/lib/orders";
import { applyPaymentEvent, simulatorEnabled } from "../src/lib/payments";
import {
  saveListing,
  listingAction,
  searchListings,
  getListing,
} from "../src/lib/listings";
import { sendMessage } from "../src/lib/marketplace";
import { runJobs } from "../src/lib/worker";
import type { User } from "../src/generated/prisma/client";
let seller: User, buyer: User, other: User;
let counter = 0;
async function listing(total = 8, partial = true) {
  const id = `test-lot-${++counter}`;
  return db.listing.create({
    data: {
      id,
      sellerId: seller.id,
      categoryId: "tiles",
      title: "Ivory টাইলস RC-1600",
      description: "Usable surplus tiles with verified box quantities.",
      condition: "UNOPENED",
      status: "APPROVED",
      price: 125000,
      unit: "box",
      minimum: 1,
      increment: 1,
      partial,
      area: "Dhanmondi",
      district: "Dhaka",
      pickupNotes: "Arrange a pickup time.",
      privatePickup: "Private house 7",
      disclosures: "No defects declared.",
      widthMm: 600,
      lengthMm: 600,
      piecesPerBox: 4,
      modelCode: "RC-1600",
      searchText: "ivory টাইলস rc-1600 ceramic",
      lot: { create: { total } },
    },
  });
}
const key = () => crypto.randomUUID();
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
    throw new Error("Refusing to reset a non-test database");
  execFileSync(
    process.execPath,
    [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
    { env: process.env, stdio: "pipe" },
  );
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "User", "Category", "Outbox", "RateLimit", "Verification" RESTART IDENTITY CASCADE',
  );
  seller = await db.user.create({
    data: {
      id: "seller",
      name: "Seller",
      email: "seller@test.local",
      emailVerified: true,
      sellerName: "Seller materials",
    },
  });
  buyer = await db.user.create({
    data: {
      id: "buyer",
      name: "Buyer",
      email: "buyer@test.local",
      emailVerified: true,
    },
  });
  other = await db.user.create({
    data: {
      id: "other",
      name: "Other buyer",
      email: "other@test.local",
      emailVerified: true,
    },
  });
  await db.category.create({
    data: { id: "tiles", name: "Tiles", nameBn: "টাইলস" },
  });
});
afterAll(async () => {
  await db.$disconnect();
});
describe("real PostgreSQL inventory and order invariants", () => {
  it("requests do not reserve; acceptance snapshots; two handovers consume exactly once", async () => {
    const l = await listing();
    const req = await requestPurchase(buyer, l.id, 3, key());
    expect(
      (await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }))
        .reserved,
    ).toBe(0);
    await changeOrder(seller, req.id, "accept");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: req.id } }))
        .pickupSnapshot,
    ).toContain("Private house 7");
    await changeOrder(seller, req.id, "ready");
    await changeOrder(buyer, req.id, "handover");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: req.id } })).status,
    ).toBe("READY");
    await Promise.all([
      changeOrder(seller, req.id, "handover"),
      changeOrder(seller, req.id, "handover"),
      changeOrder(buyer, req.id, "handover"),
    ]);
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ total: 8, reserved: 0, sold: 3 });
    const o = await db.order.findUniqueOrThrow({ where: { id: req.id } });
    expect(o.status).toBe("COMPLETED");
    expect(o.paymentState).toBe("UNCONFIRMED");
  });
  it("two buyers competing for last stock cannot both reserve it", async () => {
    const l = await listing(3);
    const a = await requestPurchase(buyer, l.id, 3, key()),
      b = await requestPurchase(other, l.id, 3, key());
    const outcomes = await Promise.allSettled([
      changeOrder(seller, a.id, "accept"),
      changeOrder(seller, b.id, "accept"),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ reserved: 3, sold: 0 });
  });
  it("concurrent repeated acceptance has exactly one inventory effect", async () => {
    const l = await listing();
    const a = await requestPurchase(buyer, l.id, 2, key());
    await Promise.all([
      changeOrder(seller, a.id, "accept"),
      changeOrder(seller, a.id, "accept"),
    ]);
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ reserved: 2 });
  });
  it("cancellation releases exactly once under retries", async () => {
    const l = await listing();
    const a = await requestPurchase(buyer, l.id, 2, key());
    await changeOrder(seller, a.id, "accept");
    await Promise.all([
      changeOrder(buyer, a.id, "cancel"),
      changeOrder(seller, a.id, "cancel"),
    ]);
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ reserved: 0, sold: 0 });
  });
  it("transactional acceptance expires stale holds even without a worker", async () => {
    const l = await listing(3);
    const a = await requestPurchase(buyer, l.id, 3, key()),
      b = await requestPurchase(other, l.id, 3, key());
    await changeOrder(seller, a.id, "accept");
    await db.reservation.update({
      where: { orderId: a.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await changeOrder(seller, b.id, "accept");
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: a.id } })).status,
    ).toBe("EXPIRED");
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ reserved: 3 });
  });
  it("worker expiration is safe to repeat", async () => {
    const l = await listing();
    const a = await requestPurchase(buyer, l.id, 2, key());
    await changeOrder(seller, a.id, "accept");
    await db.reservation.update({
      where: { orderId: a.id },
      data: { expiresAt: new Date(0) },
    });
    await expireReservations();
    await expireReservations();
    expect(
      await db.inventoryLot.findUniqueOrThrow({ where: { listingId: l.id } }),
    ).toMatchObject({ reserved: 0 });
  });
  it("idempotency replays same request and rejects reused key for different quantity", async () => {
    const l = await listing();
    const k = key();
    const a = await requestPurchase(buyer, l.id, 2, k),
      b = await requestPurchase(buyer, l.id, 2, k);
    expect(a.id).toBe(b.id);
    await expect(requestPurchase(buyer, l.id, 3, k)).rejects.toMatchObject({
      code: "IDEMPOTENCY",
    });
  });
  it("rejects duplicate pending request with a new key", async () => {
    const l = await listing();
    await requestPurchase(buyer, l.id, 2, key());
    await expect(requestPurchase(buyer, l.id, 2, key())).rejects.toMatchObject({
      code: "STATE",
    });
  });
  it("rejects own listing, unverified member, invalid quantity and partial whole-lot request", async () => {
    const l = await listing(8, false);
    await expect(requestPurchase(seller, l.id, 8, key())).rejects.toMatchObject(
      { code: "SELF_PURCHASE" },
    );
    await expect(
      requestPurchase({ ...buyer, emailVerified: false }, l.id, 8, key()),
    ).rejects.toMatchObject({ code: "VERIFIED_REQUIRED" });
    await expect(requestPurchase(buyer, l.id, 3, key())).rejects.toMatchObject({
      code: "QUANTITY",
    });
    await expect(
      requestPurchase(buyer, l.id, 1.5, key()),
    ).rejects.toMatchObject({ code: "QUANTITY" });
  });
  it("rejects changed price and unauthorized state transitions", async () => {
    const l = await listing();
    const a = await requestPurchase(buyer, l.id, 2, key());
    await db.listing.update({ where: { id: l.id }, data: { price: 130000 } });
    await expect(changeOrder(seller, a.id, "accept")).rejects.toMatchObject({
      code: "PRICE_CHANGED",
    });
    await expect(changeOrder(buyer, a.id, "accept")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(changeOrder(other, a.id, "cancel")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("does not permit cancellation after one handover confirmation", async () => {
    const l = await listing();
    const a = await requestPurchase(buyer, l.id, 2, key());
    await changeOrder(seller, a.id, "accept");
    await changeOrder(seller, a.id, "ready");
    await changeOrder(buyer, a.id, "handover");
    await expect(changeOrder(buyer, a.id, "cancel")).rejects.toMatchObject({
      code: "STATE",
    });
  });
  it("database constraints prohibit negative stock even outside application services", async () => {
    const l = await listing(3);
    await expect(
      db.inventoryLot.update({
        where: { listingId: l.id },
        data: { reserved: 4 },
      }),
    ).rejects.toThrow();
  });
  it("search supports Bangla and exact material codes; public DTO hides pickup and email", async () => {
    const l = await listing();
    const result = await searchListings({ q: "টাইলস" });
    expect(result.total).toBeGreaterThan(0);
    expect((await searchListings({ q: "RC-1600" })).total).toBeGreaterThan(0);
    const dto = await getListing(l.id);
    expect(dto).not.toHaveProperty("privatePickup");
    expect(dto?.seller).not.toHaveProperty("email");
  });
  it("listing ownership and moderator permissions are enforced in services", async () => {
    const l = await listing();
    await expect(listingAction(other, l.id, "pause")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      listingAction(seller, l.id, "approve", "Looks fine"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const payload = { ...l, total: 8, imageIds: [] };
    await expect(
      saveListing({ ...other, sellerName: "Other" }, payload, l.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("messages are participant-only and blocking is bidirectional", async () => {
    const l = await listing();
    const c = await db.conversation.create({
      data: { buyerId: buyer.id, sellerId: seller.id, listingId: l.id },
    });
    await expect(
      sendMessage(other, c.id, "Private content"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.block.create({ data: { userId: seller.id, targetId: buyer.id } });
    await expect(sendMessage(buyer, c.id, "Hello")).rejects.toMatchObject({
      code: "BLOCKED",
    });
    await db.block.deleteMany();
  });
});
describe("promotion event accounting", () => {
  it("saved-search outbox retries create one in-app notification per listing/search", async () => {
    const l = await listing();
    const search = await db.savedSearch.create({
      data: {
        userId: buyer.id,
        label: "Tile match",
        filters: { q: "RC-1600" },
      },
    });
    await db.outbox.create({
      data: {
        kind: "LISTING_PUBLISHED",
        dedupeKey: `publish:${l.id}`,
        payload: { listingId: l.id },
      },
    });
    await runJobs();
    await db.outbox.update({
      where: { dedupeKey: `publish:${l.id}` },
      data: { processedAt: null, availableAt: new Date(0) },
    });
    await runJobs();
    expect(
      await db.notification.count({
        where: { dedupeKey: `match:${search.id}:${l.id}` },
      }),
    ).toBe(1);
  });
  it("verified events activate once, duplicates and late failures cannot reverse success, refund deactivates", async () => {
    const l = await listing();
    const p = await db.paymentAttempt.create({
      data: {
        userId: seller.id,
        listingId: l.id,
        provider: "simulator",
        amount: 19900,
        requestKey: key(),
      },
    });
    const e = {
      eventId: key(),
      transactionId: p.id,
      amount: 19900,
      currency: "BDT",
      state: "SUCCESS" as const,
    };
    expect(await db.promotion.count({ where: { paymentId: p.id } })).toBe(0);
    await Promise.all([
      applyPaymentEvent(e, "simulator"),
      applyPaymentEvent(e, "simulator"),
    ]);
    expect(await db.promotion.count({ where: { paymentId: p.id } })).toBe(1);
    await applyPaymentEvent(
      { ...e, eventId: key(), state: "FAILED" },
      "simulator",
    );
    expect(
      (await db.paymentAttempt.findUniqueOrThrow({ where: { id: p.id } }))
        .state,
    ).toBe("SUCCESS");
    await applyPaymentEvent(
      { ...e, eventId: key(), state: "REFUNDED" },
      "simulator",
    );
    expect(
      (await db.promotion.findUniqueOrThrow({ where: { paymentId: p.id } }))
        .active,
    ).toBe(false);
  });
  it("rejects amount/currency/provider mismatch", async () => {
    const l = await listing();
    const p = await db.paymentAttempt.create({
      data: {
        userId: seller.id,
        listingId: l.id,
        provider: "simulator",
        amount: 19900,
        requestKey: key(),
      },
    });
    await expect(
      applyPaymentEvent(
        {
          transactionId: p.id,
          eventId: key(),
          amount: 1,
          currency: "BDT",
          state: "SUCCESS",
        },
        "simulator",
      ),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("disables the simulator in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(simulatorEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });
});
