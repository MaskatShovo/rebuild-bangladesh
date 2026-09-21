import { unitLabel } from "@/lib/format";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { wantedMatches } from "@/lib/marketplace";
import { WantedResponse } from "@/components/community";
import { ListingCard } from "@/components/cards";
import { T, Notice } from "@/components/ui";
import { publicListing } from "@/lib/listings";
export default async function WantedDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await db.wanted.findUnique({
    where: { id },
    include: {
      responses: {
        where: {
          listing: {
            status: "APPROVED",
            seller: { suspended: false },
            category: { active: true },
          },
        },
        include: { listing: { select: publicListing } },
      },
    },
  });
  if (!w) notFound();
  const user = await currentUser(await headers());
  const [matches, listings] = await Promise.all([
    wantedMatches(id),
    user
      ? db.listing.findMany({
          where: {
            sellerId: user.id,
            status: "APPROVED",
            categoryId: w.categoryId,
          },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);
  return (
    <div className="container page">
      <div className="page-title">
        <div className="eyebrow terracotta">WANTED · {w.area}</div>
        <h1>{w.title}</h1>
        <p>
          {w.quantity} {unitLabel(w.unit, w.quantity)} ·{" "}
          {w.closed ? "Closed request" : "Open request"}
        </p>
      </div>
      <div className="panel medium" style={{ marginInline: 0 }}>
        <p>{w.description}</p>
        <p>
          {w.modelCode || "Model unknown"} · {w.widthMm || "?"} ×{" "}
          {w.lengthMm || "?"} mm
        </p>
      </div>
      {user && !w.closed ? (
        <WantedResponse wantedId={id} listings={listings} />
      ) : (
        <Link href="/auth" className="button spaced">
          Sign in to respond
        </Link>
      )}
      <h2 className="spaced">
        <T en="Seller responses" bn="বিক্রেতাদের উত্তর" />
      </h2>
      <div className="listing-grid">
        {w.responses.map((r) => (
          <ListingCard key={r.id} listing={r.listing} />
        ))}
      </div>
      {!w.responses.length && <p>No responses yet.</p>}
      <h2 className="spaced">
        <T en="Possible material matches" bn="সম্ভাব্য উপকরণের মিল" />
      </h2>
      <Notice>
        Possible matches only. Confirm batch, quantity, condition and
        measurements with the seller.
      </Notice>
      <div className="listing-grid">
        {matches.map((m) => (
          <div key={m.listing.id}>
            <ListingCard listing={m.listing} />
            <p className="hint" style={{ marginTop: 10 }}>
              Matches: {m.matches.join(", ")}. Unknown:{" "}
              {m.unknown.join(", ") || "none of the checked fields"}.
              {m.mismatches.length > 0 &&
                ` Different: ${m.mismatches.join(", ")}.`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
