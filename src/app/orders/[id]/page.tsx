import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderDetail } from "@/components/order";
import { expireHolds, lockLot } from "@/lib/orders";
export const metadata = {
  title: "Pickup order",
  robots: { index: false, follow: false },
};
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser(await headers());
  if (!user) redirect("/auth");
  if (user.suspended) notFound();
  const { id } = await params;
  const found = await db.order.findFirst({
    where: { id, OR: [{ buyerId: user.id }, { sellerId: user.id }] },
  });
  if (!found) notFound();
  await db.$transaction(async (tx) => {
    await lockLot(tx, found.listingId);
    await expireHolds(tx, found.listingId);
  });
  const order = await db.order.findUniqueOrThrow({
    where: { id },
    include: { reservation: true, review: true },
  });
  return (
    <div className="container page">
      <OrderDetail order={order} userId={user.id} />
    </div>
  );
}
