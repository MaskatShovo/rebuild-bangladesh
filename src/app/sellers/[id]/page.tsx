import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { publicListing } from "@/lib/listings";
import { ListingCard } from "@/components/cards";
import { T } from "@/components/ui";
import { date } from "@/lib/format";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findFirst({
    where: { id, suspended: false, sellerName: { not: null } },
  });
  if (!user) notFound();
  const [listings, reviews] = await Promise.all([
    db.listing.findMany({
      where: { sellerId: id, status: "APPROVED" },
      select: publicListing,
      take: 100,
    }),
    db.review.findMany({
      where: { order: { sellerId: id } },
      include: { author: { select: { name: true } } },
      take: 50,
    }),
  ]);
  return (
    <div className="container page">
      <div className="page-title">
        <div className="eyebrow">SELLER PROFILE</div>
        <h1>{user.sellerName}</h1>
        <p>{user.bio}</p>
        <p>
          {user.area} · Joined {date(user.createdAt)} · {listings.length} active
          listings
        </p>
        {user.emailVerified && (
          <span className="pill">
            Email verified · no identity or inspection claim
          </span>
        )}
      </div>
      <div className="listing-grid">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
      <h2 className="spaced">
        <T en="Completed-pickup reviews" bn="সম্পন্ন পিকআপের মতামত" />
      </h2>
      {reviews.map((r) => (
        <div className="row-card" key={r.id}>
          <strong>
            {r.rating} / 5 · {r.author.name}
          </strong>
          <p>{r.body}</p>
        </div>
      ))}
      {!reviews.length && <p>No completed-order reviews yet.</p>}
    </div>
  );
}
