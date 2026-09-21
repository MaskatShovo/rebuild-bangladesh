"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order, Reservation, Review } from "@/generated/prisma/client";
import { Action, api, T, Notice } from "./ui";
import { ReportForm } from "./detail";
import { money, date, unitLabel } from "@/lib/format";
type OrderData = Order & {
  reservation: Reservation | null;
  review: Review | null;
};
export function OrderDetail({
  order: o,
  userId,
}: {
  order: OrderData;
  userId: string;
}) {
  const seller = o.sellerId === userId,
    [error, setError] = useState("");
  const router = useRouter();
  const step = ["PENDING", "ACCEPTED", "READY", "COMPLETED"].indexOf(o.status);
  return (
    <div className="panel medium">
      <div className="row-top">
        <div>
          <div className="eyebrow">
            <T
              en={seller ? "SELLING" : "BUYING"}
              bn={seller ? "বিক্রয়" : "ক্রয়"}
            />
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 500 }}>{o.titleSnapshot}</h1>
        </div>
        <span className={`status ${o.status}`}>{o.status}</span>
      </div>
      <div className="timeline">
        {["Requested", "Reserved", "Ready", "Completed"].map((s, i) => (
          <span className={step >= i ? "done" : ""} key={s}>
            {s}
          </span>
        ))}
      </div>
      <div className="row-top">
        <p>
          {o.quantity} {unitLabel(o.unitSnapshot, o.quantity)} ×{" "}
          {money(o.unitPrice)}
        </p>
        <span className="order-amount">{money(o.totalPrice)}</span>
      </div>
      <p className="hint">
        Request made {date(o.createdAt)} · Agreed price snapshot
      </p>
      {o.status === "PENDING" && (
        <Notice>
          <T
            en="Stock is not reserved yet. The seller will confirm availability before accepting."
            bn="মজুত এখনো সংরক্ষিত নয়। বিক্রেতা মজুত নিশ্চিত করে গ্রহণ করবেন।"
          />
        </Notice>
      )}
      {o.reservation && (
        <Notice>
          <T en="Reservation deadline" bn="সংরক্ষণের শেষ সময়" />:{" "}
          {new Intl.DateTimeFormat("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Dhaka",
          }).format(new Date(o.reservation.expiresAt))}{" "}
          (Dhaka) · {o.reservation.state}
        </Notice>
      )}
      {o.pickupSnapshot && (
        <div className="detail-section">
          <h2>
            <T en="Your pickup arrangements" bn="আপনার পিকআপ ব্যবস্থা" />
          </h2>
          <p>{o.pickupSnapshot}</p>
        </div>
      )}
      <div className="detail-section">
        <h2>
          <T en="Handover & payment" bn="হস্তান্তর ও মূল্য প্রদান" />
        </h2>
        <p>
          Buyer handover: {o.buyerConfirmedAt ? "confirmed" : "not confirmed"}
          <br />
          Seller handover: {o.sellerConfirmedAt ? "confirmed" : "not confirmed"}
          <br />
          Payment:{" "}
          {o.paymentState === "SELLER_CONFIRMED"
            ? "Seller says payment received"
            : "Not confirmed"}
        </p>
        <p className="hint">
          <T
            en="Handover and payment are separate confirmations. ReBuild does not collect or hold the material payment."
            bn="হস্তান্তর ও মূল্য প্রদান আলাদা নিশ্চিতকরণ। রিবিল্ড উপকরণের টাকা সংগ্রহ বা জমা রাখে না।"
          />
        </p>
        <div className="inline-actions">
          {seller && o.status === "PENDING" && (
            <>
              <Action path={`orders/${o.id}/accept`} className="button">
                <T en="Accept & reserve" bn="গ্রহণ ও সংরক্ষণ" />
              </Action>
              <Action path={`orders/${o.id}/decline`}>
                <T en="Decline" bn="প্রত্যাখ্যান" />
              </Action>
            </>
          )}
          {seller && o.status === "ACCEPTED" && (
            <Action path={`orders/${o.id}/ready`} className="button">
              <T en="Mark ready for pickup" bn="পিকআপের জন্য প্রস্তুত" />
            </Action>
          )}
          {o.status === "READY" &&
            !(seller ? o.sellerConfirmedAt : o.buyerConfirmedAt) && (
              <Action path={`orders/${o.id}/handover`} className="button">
                <T
                  en="I confirm physical handover"
                  bn="হস্তান্তর নিশ্চিত করছি"
                />
              </Action>
            )}
          {seller &&
            ["READY", "COMPLETED"].includes(o.status) &&
            o.paymentState === "UNCONFIRMED" && (
              <Action path={`orders/${o.id}/payment-received`}>
                <T en="I received the payment" bn="মূল্য পেয়েছি" />
              </Action>
            )}
          {["PENDING", "ACCEPTED", "READY"].includes(o.status) &&
            !o.buyerConfirmedAt &&
            !o.sellerConfirmedAt && (
              <Action path={`orders/${o.id}/cancel`}>
                <T en="Cancel request / order" bn="অনুরোধ / অর্ডার বাতিল" />
              </Action>
            )}
        </div>
      </div>
      {!seller && o.status === "COMPLETED" && !o.review && (
        <form
          className="detail-section"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api(`orders/${o.id}/review`, "POST", {
                rating: Number(f.get("rating")),
                body: f.get("body"),
              });
              router.refresh();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <h2>
            <T en="How did the pickup go?" bn="পিকআপ কেমন হলো?" />
          </h2>
          <label className="field">
            <span>
              <T en="Rating" bn="রেটিং" />
            </span>
            <select name="rating">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              <T en="Your review" bn="আপনার মতামত" />
            </span>
            <textarea name="body" required minLength={5} maxLength={2000} />
          </label>
          <button className="button">
            <T en="Post review" bn="মতামত দিন" />
          </button>
          {error && <Notice error>{error}</Notice>}
        </form>
      )}
      {o.review && (
        <Notice>
          {o.review.rating}/5 · {o.review.body}
        </Notice>
      )}
      <div className="spaced">
        <ReportForm targetType="ORDER" targetId={o.id} />
      </div>
    </div>
  );
}
