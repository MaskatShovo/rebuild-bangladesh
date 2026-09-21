import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Admin } from "@/components/admin";
export const metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await currentUser(await headers());
  if (!user) redirect("/auth");
  if (user.suspended || !["ADMIN", "MODERATOR"].includes(user.role)) notFound();
  return (
    <div className="container page">
      <Admin admin={user.role === "ADMIN"} />
    </div>
  );
}
