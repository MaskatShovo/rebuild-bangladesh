import "dotenv/config";
import { db } from "../src/lib/db";
const [operatorEmail, targetEmail, confirmation] = process.argv.slice(2);
if (confirmation !== "CONFIRMED_OWNERSHIP")
  throw new Error(
    "Usage: npx tsx scripts/anonymize-user.ts admin-email target-email CONFIRMED_OWNERSHIP. First confirm identity and retention obligations.",
  );
const operator = await db.user.findUnique({ where: { email: operatorEmail } }),
  target = await db.user.findUnique({ where: { email: targetEmail } });
if (
  operator?.role !== "ADMIN" ||
  operator.suspended ||
  !target ||
  operator.id === target.id
)
  throw new Error("Valid admin and different target required");
const open = await db.order.count({
  where: {
    OR: [{ buyerId: target.id }, { sellerId: target.id }],
    status: { in: ["PENDING", "ACCEPTED", "READY"] },
  },
});
if (open) throw new Error("Resolve outstanding orders before anonymisation");
await db.$transaction(async (tx) => {
  await tx.session.deleteMany({ where: { userId: target.id } });
  await tx.account.deleteMany({ where: { userId: target.id } });
  await tx.savedListing.deleteMany({ where: { userId: target.id } });
  await tx.savedSearch.deleteMany({ where: { userId: target.id } });
  await tx.notification.deleteMany({ where: { userId: target.id } });
  await tx.listing.updateMany({
    where: { sellerId: target.id },
    data: { status: "ARCHIVED", privatePickup: "Removed" },
  });
  await tx.user.update({
    where: { id: target.id },
    data: {
      name: "Deleted member",
      email: `deleted-${target.id}@invalid.local`,
      phone: null,
      sellerName: null,
      bio: null,
      image: null,
      area: "",
      emailAlerts: false,
      emailVerified: false,
      suspended: true,
    },
  });
  await tx.auditLog.create({
    data: {
      actorId: operator.id,
      action: "user:anonymise",
      targetId: target.id,
      reason:
        "Ownership confirmed by operator; profile and authentication anonymised, transaction evidence retained",
    },
  });
});
console.log(
  "Profile/authentication anonymised. Review retained transaction/message evidence under the retention policy.",
);
await db.$disconnect();
