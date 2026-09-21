import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container page">
      <h1>This material has moved on.</h1>
      <p>The page is unavailable or the listing is no longer public.</p>
      <Link className="button" href="/browse">
        Find other materials
      </Link>
    </div>
  );
}
