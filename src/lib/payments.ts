import { db } from "./db";
import { assert } from "./errors";
import type { User } from "@/generated/prisma/client";
export const PROMOTION_PRICE = 19900;
export const simulatorEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.PAYMENT_SIMULATOR === "true";
export interface VerifiedPayment {
  eventId: string;
  transactionId: string;
  amount: number;
  currency: string;
  state: "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
}
export interface PaymentProvider {
  name: string;
  verify(input: Record<string, string>): Promise<VerifiedPayment>;
}
export class SslCommerzSandbox implements PaymentProvider {
  name = "sslcommerz";
  async initiate(
    payment: { id: string; amount: number },
    user: { name: string; email: string },
  ) {
    assert(
      process.env.SSLCOMMERZ_SANDBOX === "true" &&
        process.env.SSLCOMMERZ_STORE_ID &&
        process.env.SSLCOMMERZ_STORE_PASSWORD,
      "PROVIDER_UNAVAILABLE",
      503,
    );
    const base = process.env.BETTER_AUTH_URL!;
    const fields = {
      store_id: process.env.SSLCOMMERZ_STORE_ID!,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
      total_amount: (payment.amount / 100).toFixed(2),
      currency: "BDT",
      tran_id: payment.id,
      success_url: `${base}/api/v1/payments/return`,
      fail_url: `${base}/api/v1/payments/return`,
      cancel_url: `${base}/api/v1/payments/return`,
      ipn_url: `${base}/api/v1/payments/ssl-ipn`,
      cus_name: user.name,
      cus_email: user.email,
      cus_add1: "Not applicable - digital promotion",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      cus_phone: "",
      shipping_method: "NO",
      product_name: "Seven-day featured material listing",
      product_category: "Digital promotion",
      product_profile: "non-physical-goods",
    };
    const response = await fetch(
      "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
      {
        method: "POST",
        body: new URLSearchParams(fields),
        signal: AbortSignal.timeout(15000),
      },
    );
    assert(response.ok, "PROVIDER_UNAVAILABLE", 503);
    const data = await response.json();
    assert(
      data.status === "SUCCESS" && typeof data.GatewayPageURL === "string",
      "PROVIDER_UNAVAILABLE",
      503,
    );
    const destination = new URL(data.GatewayPageURL);
    assert(
      destination.protocol === "https:" &&
        destination.hostname === "sandbox.sslcommerz.com",
      "PROVIDER_UNAVAILABLE",
      503,
    );
    return destination.href;
  }
  async verify(input: Record<string, string>): Promise<VerifiedPayment> {
    assert(
      process.env.SSLCOMMERZ_SANDBOX === "true" &&
        process.env.SSLCOMMERZ_STORE_ID &&
        process.env.SSLCOMMERZ_STORE_PASSWORD,
      "PROVIDER_UNAVAILABLE",
      503,
    );
    assert(input.val_id, "INVALID_INPUT");
    const url = new URL(
      "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php",
    );
    url.search = new URLSearchParams({
      val_id: input.val_id,
      store_id: process.env.SSLCOMMERZ_STORE_ID!,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
      format: "json",
      v: "1",
    }).toString();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    assert(response.ok, "PROVIDER_UNAVAILABLE", 503);
    const data = await response.json();
    assert(
      ["VALID", "VALIDATED"].includes(data.status) &&
        data.tran_id &&
        data.val_id === input.val_id &&
        data.currency === "BDT" &&
        String(data.risk_level || "0") === "0",
      "INVALID_INPUT",
    );
    return {
      eventId: `ssl:${data.val_id}`,
      transactionId: data.tran_id,
      amount: Math.round(Number(data.amount) * 100),
      currency: data.currency,
      state: "SUCCESS",
    };
  }
}
export async function createPromotionPayment(
  user: User,
  listingId: string,
  key: string,
) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  assert(
    listing?.sellerId === user.id && listing.status === "APPROVED",
    "FORBIDDEN",
    403,
  );
  const simulator = simulatorEnabled();
  assert(
    simulator ||
      (process.env.SSLCOMMERZ_SANDBOX === "true" &&
        process.env.SSLCOMMERZ_STORE_ID &&
        process.env.SSLCOMMERZ_STORE_PASSWORD),
    "PROVIDER_UNAVAILABLE",
    503,
  );
  const previous = await db.paymentAttempt.findUnique({
    where: { userId_requestKey: { userId: user.id, requestKey: key } },
  });
  if (previous) {
    assert(previous.listingId === listingId, "IDEMPOTENCY", 409);
    return previous;
  }
  const payment = await db.paymentAttempt.create({
    data: {
      userId: user.id,
      listingId,
      provider: simulator ? "simulator" : "sslcommerz",
      amount: PROMOTION_PRICE,
      requestKey: key,
    },
  });
  if (simulator) return payment;
  const checkoutUrl = await new SslCommerzSandbox().initiate(payment, user);
  return { ...payment, checkoutUrl };
}
export async function applyPaymentEvent(
  event: VerifiedPayment,
  expectedProvider: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PaymentAttempt" WHERE id = ${event.transactionId} FOR UPDATE`;
    const p = await tx.paymentAttempt.findUnique({
      where: { id: event.transactionId },
    });
    assert(
      p &&
        p.provider === expectedProvider &&
        p.amount === event.amount &&
        p.currency === event.currency,
      "INVALID_INPUT",
    );
    const old = await tx.paymentEvent.findUnique({
      where: { providerEventId: event.eventId },
    });
    if (old) {
      assert(old.paymentId === p.id, "INVALID_INPUT");
      return p;
    }
    await tx.paymentEvent.create({
      data: {
        paymentId: p.id,
        providerEventId: event.eventId,
        state: event.state,
        verified: true,
      },
    });
    if (event.state === "SUCCESS" && p.state === "PENDING") {
      await tx.paymentAttempt.update({
        where: { id: p.id },
        data: { state: "SUCCESS" },
      });
      await tx.promotion.create({
        data: {
          listingId: p.listingId,
          paymentId: p.id,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
    } else if (event.state === "REFUNDED" && p.state === "SUCCESS") {
      await tx.paymentAttempt.update({
        where: { id: p.id },
        data: { state: "REFUNDED" },
      });
      await tx.promotion.updateMany({
        where: { paymentId: p.id },
        data: { active: false },
      });
    } else if (
      ["FAILED", "CANCELLED"].includes(event.state) &&
      p.state === "PENDING"
    )
      await tx.paymentAttempt.update({
        where: { id: p.id },
        data: { state: event.state },
      });
    return tx.paymentAttempt.findUniqueOrThrow({
      where: { id: p.id },
      include: { promotion: true },
    });
  });
}
