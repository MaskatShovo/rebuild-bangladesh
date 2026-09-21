import Link from "next/link";
import { searchListings } from "@/lib/listings";
import { ListingCard } from "@/components/cards";
import { SearchFilters, BrowseToolbar } from "@/components/browse";
import { T, Empty } from "@/components/ui";
export const metadata = {
  title: "Find materials",
  alternates: { canonical: "/browse" },
};
export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const result = await searchListings(params);
  const pageLink = (page: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(page));
    return `/browse?${q}`;
  };
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link href="/">Home</Link> / <T en="Find materials" bn="উপকরণ খুঁজুন" />
      </div>
      <div className="page-title">
        <h1>
          <T
            en="Good materials. New possibilities."
            bn="ভালো উপকরণ। নতুন সম্ভাবনা।"
          />
        </h1>
        <p>
          <T
            en="Find the right size, finish and quantity for your next project."
            bn="আপনার কাজের জন্য সঠিক মাপ, ফিনিশ ও পরিমাণ খুঁজুন।"
          />
        </p>
      </div>
      <div className="browse-layout">
        <aside>
          <SearchFilters values={result.filters} />
        </aside>
        <section>
          <BrowseToolbar total={result.total} filters={result.filters} />
          {result.items.length ? (
            <div className="listing-grid">
              {result.items.map((l, index) => (
                <ListingCard key={l.id} listing={l} eager={index < 2} />
              ))}
            </div>
          ) : (
            <Empty title="No matching materials yet">
              <p>
                Try fewer filters, or post what you need on the wanted board.
              </p>
              <Link className="button" href="/wanted/new">
                Post a wanted request
              </Link>
            </Empty>
          )}
          <div className="pagination">
            {result.page > 1 && (
              <Link
                className="button secondary"
                href={pageLink(result.page - 1)}
              >
                Previous
              </Link>
            )}
            <span>
              {result.page} / {Math.max(1, result.pages)}
            </span>
            {result.page < result.pages && (
              <Link
                className="button secondary"
                href={pageLink(result.page + 1)}
              >
                Next
              </Link>
            )}
          </div>
          <Link href="/compare" className="text-link spaced">
            <T en="Open material comparison" bn="উপকরণ তুলনা দেখুন" /> →
          </Link>
        </section>
      </div>
    </div>
  );
}
