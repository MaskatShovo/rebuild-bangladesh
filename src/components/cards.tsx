"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PublicListing } from "@/lib/listings";
import { money, conditionLabel, unitLabel } from "@/lib/format";
import { Icon, T, useLocale, api } from "./ui";
export function ListingCard({
  listing: l,
  initiallySaved = false,
  eager = false,
}: {
  listing: PublicListing;
  initiallySaved?: boolean;
  eager?: boolean;
}) {
  const locale = useLocale(),
    [saved, setSaved] = useState(initiallySaved),
    [error, setError] = useState(""),
    [compared, setCompared] = useState(false);
  const available = l.lot ? l.lot.total - l.lot.reserved - l.lot.sold : 0;
  return (
    <article className="listing-card">
      <div className="card-photo">
        <Link href={`/listings/${l.id}`} tabIndex={-1}>
          {l.images[0] ? (
            <Image
              unoptimized
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              src={`/api/v1/media/${l.images[0].id}`}
              alt={l.images[0].alt}
              fill
              sizes="(max-width: 600px) 90vw, (max-width: 1000px) 45vw, 24vw"
            />
          ) : (
            <div className="photo-missing">
              <Icon name="Layers" size={44} />
            </div>
          )}
        </Link>
        {l.promotions.length > 0 && (
          <span className="featured">
            <T en="Featured" bn="প্রচারিত" />
          </span>
        )}
        <button
          className={`save-button ${saved ? "saved" : ""}`}
          aria-label={saved ? "Unsave listing" : "Save listing"}
          onClick={async () => {
            try {
              await api(`saved/${l.id}`, saved ? "DELETE" : "POST");
              setSaved(!saved);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Icon name="Heart" size={18} />
        </button>
        <span className="condition">{conditionLabel(l.condition, locale)}</span>
      </div>
      <div className="card-body">
        <div className="card-category">
          {locale === "bn" ? l.category.nameBn : l.category.name}
        </div>
        <Link href={`/listings/${l.id}`} className="card-title">
          {l.title}
        </Link>
        <div className="card-spec">
          {l.widthMm && l.lengthMm
            ? `${l.widthMm} × ${l.lengthMm} mm`
            : l.brand ||
              (locale === "bn" ? "বিস্তারিত দেখুন" : "See material details")}
          {l.finish ? ` · ${l.finish}` : ""}
        </div>
        <div className="card-price">
          {money(l.price)} <span>/ {l.unit}</span>
        </div>
        <div className="card-stock">
          {available} {unitLabel(l.unit, available, locale)}{" "}
          <T en="available" bn="পাওয়া যাচ্ছে" />
          {l.partial && (
            <span className="partial-dot">
              {" "}
              · <T en="Buy what you need" bn="প্রয়োজনমতো কিনুন" />
            </span>
          )}
        </div>
        <div className="card-bottom">
          <span>
            <Icon name="MapPin" size={14} />
            {l.area}
          </span>
          <button
            aria-label={compared ? "Added to comparison" : "Add to comparison"}
            className="compare-button"
            onClick={() => {
              const ids: { id: string; category: string }[] = JSON.parse(
                localStorage.getItem("compare") || "[]",
              );
              if (ids.some((x) => x.id === l.id)) {
                setCompared(true);
                return;
              }
              if (
                ids.length >= 3 ||
                ids.some((x) => x.category !== l.categoryId)
              ) {
                setError(
                  locale === "bn"
                    ? "একই বিভাগের সর্বোচ্চ ৩টি উপকরণ তুলনা করুন।"
                    : "Compare up to 3 materials from the same category.",
                );
                return;
              }
              localStorage.setItem(
                "compare",
                JSON.stringify([...ids, { id: l.id, category: l.categoryId }]),
              );
              setCompared(true);
              setError("");
            }}
          >
            <Icon name={compared ? "Check" : "Plus"} size={15} />
            <T en="Compare" bn="তুলনা" />
          </button>
        </div>
        <div className="seller-line">
          {l.seller.sellerName || l.seller.name}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}{" "}
            <Link href="/auth">
              <T en="Sign in" bn="সাইন ইন" />
            </Link>
          </p>
        )}
      </div>
    </article>
  );
}
