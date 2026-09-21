import { unitLabel } from "@/lib/format";
import Link from "next/link";
import { db } from "@/lib/db";
import { T, Empty } from "@/components/ui";
export const metadata = { title: "Wanted materials" };
export default async function Wanted({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(
    1,
    Math.min(10000, Number((await searchParams).page) || 1),
  );
  const items = await db.wanted.findMany({
    where: { closed: false, user: { suspended: false } },
    take: 20,
    skip: (page - 1) * 20,
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="container page">
      <div className="section-heading page-title">
        <div>
          <div className="eyebrow">
            <T en="MAKE A MATERIAL MATCH" bn="উপকরণের মিল খুঁজুন" />
          </div>
          <h1>
            <T
              en="Looking for something specific?"
              bn="বিশেষ কোনো উপকরণ খুঁজছেন?"
            />
          </h1>
          <p>
            <T
              en="Tell the community what your project needs."
              bn="আপনার কাজের প্রয়োজনীয় উপকরণের কথা জানান।"
            />
          </p>
        </div>
        <Link className="button" href="/wanted/new">
          <T en="Post a request" bn="চাহিদা জানান" />
        </Link>
      </div>
      <div className="wanted-grid">
        {items.map((w) => (
          <Link href={`/wanted/${w.id}`} className="wanted-card" key={w.id}>
            <div className="eyebrow terracotta">WANTED · {w.categoryId}</div>
            <h3>{w.title}</h3>
            <p>
              {w.quantity} {unitLabel(w.unit, w.quantity)} · {w.area}
            </p>
            <p>{w.description.slice(0, 100)}</p>
            <span className="text-link">See possible matches →</span>
          </Link>
        ))}
      </div>
      {!items.length && <Empty title="No requests on this page" />}
      <div className="pagination">
        {page > 1 && (
          <Link className="button secondary" href={`/wanted?page=${page - 1}`}>
            Previous
          </Link>
        )}
        {items.length === 20 && (
          <Link className="button secondary" href={`/wanted?page=${page + 1}`}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
