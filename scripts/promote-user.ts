import "dotenv/config";
import { db } from "../src/lib/db";
const [email, role] = process.argv.slice(2);
if (!email || !["ADMIN", "MODERATOR"].includes(role))
  throw new Error(
    "Usage: npx tsx scripts/promote-user.ts verified-email ADMIN|MODERATOR",
  );
const user = await db.user.findUnique({ where: { email } });
if (!user?.emailVerified)
  throw new Error("An existing verified account is required");
await db.$transaction(async (tx) => {
  await tx.user.update({ where: { id: user.id }, data: { role } });
  await tx.auditLog.create({
    data: {
      actorId: user.id,
      action: "operator:grant-role",
      targetId: user.id,
      reason: "Role assigned through trusted server operator CLI",
    },
  });
});
console.log("Role assigned; audit recorded.");
await db.$disconnect();
