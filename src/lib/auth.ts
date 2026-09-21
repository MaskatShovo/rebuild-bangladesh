import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { assert } from "./errors";
import type { User } from "@/generated/prisma/client";

async function queueEmail(
  email: string,
  url: string,
  purpose: "verify" | "reset",
) {
  const user = await db.user.findUnique({ where: { email } });
  const bn = user?.locale === "bn";
  const subject =
    purpose === "verify"
      ? bn
        ? "আপনার ইমেইল যাচাই করুন"
        : "Verify your ReBuild email"
      : bn
        ? "পাসওয়ার্ড পরিবর্তন করুন"
        : "Reset your ReBuild password";
  await db.outbox.create({
    data: {
      kind: "EMAIL",
      dedupeKey: crypto.randomUUID(),
      payload: {
        to: email,
        subject,
        text: `${subject}\n\n${url}\n\n${bn ? "আপনি অনুরোধ না করলে এই বার্তাটি উপেক্ষা করুন।" : "If you did not request this, ignore this email."}`,
      },
    },
  });
}
export const auth = betterAuth({
  appName: "ReBuild Bangladesh",
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const member = await db.user.findUnique({
            where: { id: session.userId },
          });
          if (
            !member ||
            member.suspended ||
            (process.env.NODE_ENV === "production" &&
              member.id.startsWith("demo-"))
          )
            return false;
          return { data: session };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 1800,
    sendResetPassword: async ({ user, url }) =>
      queueEmail(user.email, url, "reset"),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) =>
      queueEmail(user.email, url, "verify"),
  },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
  user: {
    additionalFields: {
      locale: {
        type: "string",
        required: false,
        defaultValue: "en",
        input: true,
      },
    },
  },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
});
export async function currentUser(headers: Headers): Promise<User | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  if (
    process.env.NODE_ENV === "production" &&
    session.user.id.startsWith("demo-")
  )
    return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}
export async function requireUser(headers: Headers, verified = false) {
  const user = await currentUser(headers);
  assert(user, "AUTH_REQUIRED", 401);
  assert(!user.suspended, "SUSPENDED", 403);
  if (verified) assert(user.emailVerified, "VERIFIED_REQUIRED", 403);
  return user;
}
export function requireRole(user: User, adminOnly = false) {
  assert(
    adminOnly
      ? user.role === "ADMIN"
      : ["MODERATOR", "ADMIN"].includes(user.role),
    "FORBIDDEN",
    403,
  );
}
