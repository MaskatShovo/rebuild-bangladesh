import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Messages } from "@/components/community";
export const metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser(await headers());
  if (!user) redirect("/auth");
  const { id } = await params;
  const c = await db.conversation.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
  });
  if (!c || user.suspended) notFound();
  return (
    <div className="container page">
      <Messages conversationId={id} userId={user.id} />
    </div>
  );
}
