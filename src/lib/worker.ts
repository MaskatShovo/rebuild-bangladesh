import nodemailer from "nodemailer";
import { db } from "./db";
import { expireReservations } from "./orders";
import { searchListings } from "./listings";
import { cleanupUploads } from "./storage";
import type { Prisma } from "@/generated/prisma/client";
const mail = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === "true",
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
    : {}),
});
export async function runJobs() {
  await expireReservations();
  await db.promotion.updateMany({
    where: { active: true, expiresAt: { lte: new Date() } },
    data: { active: false },
  });
  const candidates = await db.outbox.findMany({
    where: {
      processedAt: null,
      availableAt: { lte: new Date() },
      attempts: { lt: 8 },
    },
    take: 40,
    orderBy: { createdAt: "asc" },
  });
  for (const candidate of candidates) {
    // Atomic compare-and-set claim with a lease: worker crashes are retried after five minutes.
    const claim = await db.outbox.updateMany({
      where: {
        id: candidate.id,
        processedAt: null,
        availableAt: candidate.availableAt,
      },
      data: {
        availableAt: new Date(Date.now() + 300000),
        attempts: { increment: 1 },
      },
    });
    if (!claim.count) continue;
    try {
      const payload = candidate.payload as Record<string, string>;
      if (candidate.kind === "EMAIL")
        await mail.sendMail({
          from: process.env.EMAIL_FROM,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          messageId: `<${candidate.id}@rebuild.local>`,
        });
      if (candidate.kind === "LISTING_PUBLISHED") {
        const searches = await db.savedSearch.findMany({
          include: { user: true },
        });
        for (const search of searches) {
          if (search.user.suspended) continue;
          const filters = search.filters as Record<string, unknown>;
          let matches = false;
          for (let page = 1; ; page++) {
            const result = await searchListings({ ...filters, page });
            if (result.items.some((l) => l.id === payload.listingId)) {
              matches = true;
              break;
            }
            if (page >= result.pages) break;
          }
          if (!matches) continue;
          const key = `match:${search.id}:${payload.listingId}`;
          await db.notification.upsert({
            where: { dedupeKey: key },
            create: {
              userId: search.userId,
              title: `New match for ${search.label}`,
              titleBn: `নতুন মিল: ${search.label}`,
              href: `/listings/${payload.listingId}`,
              dedupeKey: key,
            },
            update: {},
          });
          if (search.user.emailAlerts)
            await db.outbox.upsert({
              where: { dedupeKey: `email:${key}` },
              create: {
                kind: "EMAIL",
                dedupeKey: `email:${key}`,
                payload: {
                  to: search.user.email,
                  subject:
                    search.user.locale === "bn"
                      ? "আপনার অনুসন্ধানের নতুন মিল"
                      : "A new material matches your search",
                  text: `${process.env.BETTER_AUTH_URL}/listings/${payload.listingId}`,
                } as Prisma.InputJsonValue,
              },
              update: {},
            });
        }
      }
      await db.outbox.update({
        where: { id: candidate.id },
        data: { processedAt: new Date(), lastError: null },
      });
    } catch {
      await db.outbox.update({
        where: { id: candidate.id },
        data: {
          lastError: "Delivery failed; retry scheduled",
          availableAt: new Date(
            Date.now() + Math.min(3600000, 2 ** candidate.attempts * 30000),
          ),
        },
      });
    }
  }
  await cleanupUploads();
  return { processed: candidates.length };
}
