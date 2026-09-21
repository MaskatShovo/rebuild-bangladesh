import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/listings";
import {
  Gallery,
  PurchasePanel,
  Calculator,
  ContactSeller,
  ReportForm,
} from "@/components/detail";
import { T, Icon } from "@/components/ui";
import { money, date, conditionLabel, unitLabel } from "@/lib/format";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const l = await getListing((await params).id);
  return {
    title: l?.title || "Material not found",
    description: l?.description.slice(0, 150),
    alternates: { canonical: `/listings/${(await params).id}` },
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const l = await getListing((await params).id);
  if (!l) notFound();
  const available = l.lot ? l.lot.total - l.lot.reserved - l.lot.sold : 0;
  const rows = [
    ["Brand", l.brand],
    ["Model / code", l.modelCode],
    ["Batch / shade", l.batchCode],
    [
      "Dimensions",
      l.widthMm && l.lengthMm ? `${l.widthMm} × ${l.lengthMm} mm` : null,
    ],
    ["Finish", l.finish],
    ["Colour", l.colour],
    ["Pieces per box", l.piecesPerBox],
    ["Material", l.material],
    ["Minimum purchase", `${l.minimum} ${l.unit}`],
    ["Sale increment", `${l.increment} ${l.unit}`],
  ];
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link href="/">Home</Link> / <Link href="/browse">Materials</Link> /{" "}
        {l.categoryId}
      </div>
      <div className="detail-grid">
        <div>
          <Gallery images={l.images} />
          <div className="detail-section">
            <h2>
              <T en="The details that matter" bn="প্রয়োজনীয় বিবরণ" />
            </h2>
            <table className="spec-table">
              <tbody>
                {rows.map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{value ?? "Unknown · ask the seller"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Calculator listing={l} />
          <div className="detail-section">
            <h2>
              <T en="About this material" bn="উপকরণের বিবরণ" />
            </h2>
            <p>{l.description}</p>
            <h3>
              <T en="Condition & disclosures" bn="অবস্থা ও ঘোষণা" />
            </h3>
            <p>{l.disclosures}</p>
          </div>
          <ContactSeller listingId={l.id} />
        </div>
        <div className="detail-copy">
          <div className="eyebrow">
            {l.categoryId.toUpperCase()} · <Icon name="MapPin" size={13} />
            {l.area}, {l.district}
          </div>
          <h1>{l.title}</h1>
          <span className="pill">{conditionLabel(l.condition)}</span>
          {l.partial && (
            <span className="pill">
              <T en="Partial purchases welcome" bn="আংশিক ক্রয় করা যাবে" />
            </span>
          )}
          <div className="detail-price">
            {money(l.price)} <small>/ {l.unit}</small>
          </div>
          <p className="hint">
            <T en="Available lot total" bn="পুরো লটের মোট মূল্য" />:{" "}
            {money(l.price * available)} · {available}{" "}
            {unitLabel(l.unit, available)}
          </p>
          <PurchasePanel listing={l} />
          <div className="detail-section">
            <h2>
              <T en="Pickup & transport" bn="পিকআপ ও পরিবহন" />
            </h2>
            <p>{l.pickupNotes}</p>
            <p>
              <T
                en="Exact pickup details are shared after the seller accepts your request. Arrange suitable transport yourself."
                bn="বিক্রেতা অনুরোধ গ্রহণ করলে সঠিক ঠিকানা পাবেন। উপযুক্ত পরিবহন নিজে ব্যবস্থা করুন।"
              />
            </p>
          </div>
          <div className="detail-section">
            <div className="eyebrow">
              <T en="LISTED BY" bn="বিক্রেতা" />
            </div>
            <Link href={`/sellers/${l.seller.id}`}>
              <h3>{l.seller.sellerName || l.seller.name} ↗</h3>
            </Link>
            <p className="hint">
              <T en="Joined" bn="যোগ দিয়েছেন" /> {date(l.seller.createdAt)}
            </p>
            {l.seller.emailVerified && (
              <span className="pill">
                <T en="Email verified" bn="ইমেইল যাচাইকৃত" />
              </span>
            )}
            <p className="hint">
              <T
                en="Email verification is not an identity check or material inspection."
                bn="ইমেইল যাচাই পরিচয় বা উপকরণ পরীক্ষার নিশ্চয়তা নয়।"
              />
            </p>
          </div>
          <div className="spaced">
            <ReportForm targetType="LISTING" targetId={l.id} />
            <Link
              className="text-link"
              href="/compare"
              style={{ marginLeft: 20 }}
            >
              <T en="Compare materials" bn="উপকরণ তুলনা করুন" /> →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
