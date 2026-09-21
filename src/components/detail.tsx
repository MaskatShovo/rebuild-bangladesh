"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicListing } from "@/lib/listings";
import { coverage } from "@/lib/validation";
import { money } from "@/lib/format";
import { api, T, Notice, Icon, useLocale } from "./ui";
export function Gallery({ images }: { images: PublicListing["images"] }) {
  const [index, setIndex] = useState(0);
  return (
    <>
      <div className="detail-photo">
        {images[index] && (
          <Image
            unoptimized
            src={`/api/v1/media/${images[index].id}?full=1`}
            alt={images[index].alt}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width:600px) 100vw, 55vw"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="photo-strip">
          {images.map((image, i) => (
            <button
              key={image.id}
              className={i === index ? "selected" : ""}
              onClick={() => setIndex(i)}
              aria-label={`View photograph ${i + 1}`}
            >
              <Image
                unoptimized
                src={`/api/v1/media/${image.id}`}
                alt=""
                fill
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
export function PurchasePanel({ listing: l }: { listing: PublicListing }) {
  const available = l.lot ? l.lot.total - l.lot.reserved - l.lot.sold : 0;
  const [quantity, setQuantity] = useState(l.partial ? l.minimum : available),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="purchase-panel">
      <div className="purchase-row">
        <label htmlFor="purchase-quantity">
          <T en="Your quantity" bn="আপনার পরিমাণ" />
          <small className="hint" style={{ display: "block" }}>
            {available} {l.unit}s <T en="available" bn="পাওয়া যাচ্ছে" />
          </small>
        </label>
        <input
          id="purchase-quantity"
          type="number"
          min={l.minimum}
          max={available}
          step={l.increment}
          value={quantity}
          readOnly={!l.partial}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>
      <div className="purchase-row spaced">
        <span>
          <T en="Your material total" bn="আপনার মোট মূল্য" />
        </span>
        <strong>{money(l.price * quantity)}</strong>
      </div>
      <button
        disabled={busy || available === 0}
        className="button"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const o = await api<{ id: string }>(
              "orders",
              "POST",
              { listingId: l.id, quantity },
              crypto.randomUUID(),
            );
            router.push(`/orders/${o.id}`);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <T
          en={busy ? "Sending…" : "Request to buy"}
          bn={busy ? "পাঠানো হচ্ছে…" : "কেনার অনুরোধ করুন"}
        />
        <Icon name="ArrowRight" size={17} />
      </button>
      <p className="hint" style={{ margin: "12px 0 0" }}>
        <T
          en="Pay the seller at pickup. A request does not reserve stock; the seller must accept it first."
          bn="পিকআপের সময় বিক্রেতাকে মূল্য দিন। অনুরোধে মজুত সংরক্ষিত হয় না; বিক্রেতার সম্মতি প্রয়োজন।"
        />
      </p>
      {error && <Notice error>{error}</Notice>}
    </div>
  );
}
export function Calculator({ listing: l }: { listing: PublicListing }) {
  const [area, setArea] = useState(10),
    [waste, setWaste] = useState(10);
  const result = coverage(
    l.widthMm,
    l.lengthMm,
    l.piecesPerBox,
    area,
    waste,
    l.increment,
  );
  if (l.categoryId !== "tiles" || l.unit !== "box") return null;
  return (
    <div className="detail-section">
      <h2>
        <T en="How many boxes do you need?" bn="কত বাক্স প্রয়োজন?" />
      </h2>
      <div className="field-row">
        <label className="field">
          <span>
            <T en="Room area (m²)" bn="ঘরের আয়তন (বর্গমিটার)" />
          </span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>
            <T en="Wastage allowance (%)" bn="অপচয়ের অনুমান (%)" />
          </span>
          <input
            type="number"
            min="0"
            max="30"
            value={waste}
            onChange={(e) => setWaste(Number(e.target.value))}
          />
        </label>
      </div>
      {result ? (
        <Notice>
          <strong>
            {Math.max(l.minimum, result.boxes)} <T en="boxes" bn="বাক্স" />
          </strong>{" "}
          · {result.squareMetresPerBox.toFixed(2)} m² / box
          <p className="hint" style={{ margin: "8px 0 0" }}>
            Width × length × pieces per box ÷ 1,000,000. Rounded up to the
            minimum and sale increment. Confirm seller-declared dimensions
            before ordering.
          </p>
        </Notice>
      ) : (
        <Notice>
          <T
            en="Coverage cannot be calculated without verified dimensions and pieces per box."
            bn="মাপ ও প্রতি বাক্সে টাইলসের সংখ্যা ছাড়া হিসাব করা যাবে না।"
          />
        </Notice>
      )}
    </div>
  );
}
export function ContactSeller({ listingId }: { listingId: string }) {
  const [body, setBody] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <form
      className="detail-section"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const c = await api<{ id: string }>("conversations", "POST", {
            listingId,
            body,
          });
          router.push(`/messages/${c.id}`);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>
        <T en="Ask the seller" bn="বিক্রেতাকে জিজ্ঞেস করুন" />
      </h2>
      <label className="field">
        <span>
          <T en="Your message" bn="আপনার বার্তা" />
        </span>
        <textarea
          required
          minLength={1}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Can you confirm the batch code and pickup access?"
        />
      </label>
      <button className="button secondary">
        <Icon name="MessageCircle" />
        <T en="Send message" bn="বার্তা পাঠান" />
      </button>
      {error && <Notice error>{error}</Notice>}
    </form>
  );
}
export function ReportForm({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: string;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState("");
  const locale = useLocale();
  return (
    <div>
      <button className="text-button" onClick={() => setOpen(!open)}>
        <T en="Report a problem" bn="সমস্যা জানান" />
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("reports", "POST", { targetType, targetId, reason });
              setMessage(
                locale === "bn"
                  ? "রিপোর্ট জমা হয়েছে।"
                  : "Report submitted for review.",
              );
              setReason("");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <label className="field">
            <span>
              <T en="What happened?" bn="কী হয়েছে?" />
            </span>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="button secondary">
            <T en="Submit report" bn="রিপোর্ট জমা দিন" />
          </button>
          {message && <Notice>{message}</Notice>}
        </form>
      )}
    </div>
  );
}
