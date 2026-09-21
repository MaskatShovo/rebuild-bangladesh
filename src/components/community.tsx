"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { PublicListing } from "@/lib/listings";
import type { Message, Conversation } from "@/generated/prisma/client";
import { api, Action, T, Notice, Empty, useLocale } from "./ui";
import { categories, money, date } from "@/lib/format";
import { ReportForm } from "./detail";
export function WantedForm() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter(),
    locale = useLocale();
  return (
    <form
      className="panel medium"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const w = await api<{ id: string }>("wanted", "POST", {
            title: f.get("title"),
            description: f.get("description"),
            categoryId: f.get("categoryId"),
            area: f.get("area"),
            quantity: Number(f.get("quantity")),
            unit: f.get("unit"),
            modelCode: f.get("modelCode") || null,
            widthMm: f.get("widthMm") ? Number(f.get("widthMm")) : null,
            lengthMm: f.get("lengthMm") ? Number(f.get("lengthMm")) : null,
            deadline: f.get("deadline")
              ? new Date(
                  String(f.get("deadline")) + "T23:59:59+06:00",
                ).toISOString()
              : null,
          });
          router.push(`/wanted/${w.id}`);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field-row">
        <label className="field">
          <span>
            <T en="What do you need?" bn="কোন উপকরণ প্রয়োজন?" />
          </span>
          <input name="title" required minLength={8} maxLength={140} />
        </label>
        <label className="field">
          <span>
            <T en="Category" bn="বিভাগ" />
          </span>
          <select name="categoryId">
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {locale === "bn" ? c.bn : c.en}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>
          <T
            en="Specifications and useful details"
            bn="মাপ ও প্রয়োজনীয় বিবরণ"
          />
        </span>
        <textarea name="description" minLength={10} maxLength={2000} required />
      </label>
      <div className="field-row">
        {[
          ["area", "Pickup area", "text"],
          ["quantity", "Quantity", "number"],
          ["modelCode", "Exact model / code (optional)", "text"],
          ["widthMm", "Width in mm (optional)", "number"],
          ["lengthMm", "Length in mm (optional)", "number"],
          ["deadline", "Needed by (optional)", "date"],
        ].map(([name, label, type]) => (
          <label className="field" key={name}>
            <span>{label}</span>
            <input
              name={name}
              type={type}
              required={["area", "quantity"].includes(name)}
              min={type === "number" ? "1" : undefined}
            />
          </label>
        ))}
        <label className="field">
          <span>Unit</span>
          <select name="unit">
            {["box", "piece", "set", "pack"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <button className="button" disabled={busy}>
        <T en="Post wanted request" bn="চাহিদা প্রকাশ করুন" />
      </button>
      {error && <Notice error>{error}</Notice>}
    </form>
  );
}
export function WantedResponse({
  wantedId,
  listings,
}: {
  wantedId: string;
  listings: { id: string; title: string }[];
}) {
  const [id, setId] = useState(listings[0]?.id || "");
  return (
    <div className="panel spaced">
      <h3>
        <T en="Have a possible match?" bn="মিল আছে এমন উপকরণ আছে?" />
      </h3>
      {listings.length ? (
        <>
          <label className="field">
            <span>
              <T
                en="Choose your actual published listing"
                bn="আপনার প্রকাশিত বিজ্ঞাপন বেছে নিন"
              />
            </span>
            <select value={id} onChange={(e) => setId(e.target.value)}>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <Action path={`wanted/${wantedId}/respond`} body={{ listingId: id }}>
            <T en="Respond with listing" bn="বিজ্ঞাপন দিয়ে উত্তর দিন" />
          </Action>
        </>
      ) : (
        <p>
          <T
            en="Publish a listing in this category to respond."
            bn="উত্তর দিতে এই বিভাগে বিজ্ঞাপন প্রকাশ করুন।"
          />{" "}
          <Link href="/sell">Create listing →</Link>
        </p>
      )}
    </div>
  );
}
export function Messages({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const [data, setData] = useState<{
      conversation: Conversation;
      messages: Message[];
    } | null>(null),
    [error, setError] = useState(""),
    [body, setBody] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api<{
          conversation: Conversation;
          messages: Message[];
        }>(`conversations/${conversationId}?page=${page}`);
        if (alive) setData(r);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [conversationId, page]);
  const target = data
    ? data.conversation.buyerId === userId
      ? data.conversation.sellerId
      : data.conversation.buyerId
    : "";
  return (
    <div className="panel medium">
      <div className="row-top">
        <h1 style={{ fontSize: 28, fontWeight: 500 }}>
          <T en="Your conversation" bn="আপনার কথোপকথন" />
        </h1>
        <Link href="/dashboard/messages">← Inbox</Link>
      </div>
      <p className="hint">
        <T
          en="Keep pickup details in this private conversation. New messages appear automatically."
          bn="পিকআপের তথ্য এই ব্যক্তিগত কথোপকথনে রাখুন। নতুন বার্তা স্বয়ংক্রিয়ভাবে দেখা যাবে।"
        />
      </p>
      <div className="inline-actions">
        <button
          className="button secondary small"
          onClick={() => setPage(page + 1)}
        >
          Older messages
        </button>
        {page > 1 && (
          <button
            className="button secondary small"
            onClick={() => setPage(page - 1)}
          >
            Newer messages
          </button>
        )}
      </div>
      <div className="message-list" aria-live="polite">
        {data?.messages.map((m) => (
          <div
            className={`message ${m.senderId === userId ? "own" : ""}`}
            key={m.id}
          >
            {m.body}
            <small>{date(m.createdAt)}</small>
          </div>
        ))}
        {data && !data.messages.length && <p>No messages on this page.</p>}
      </div>
      <form
        className="message-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(`conversations/${conversationId}`, "POST", { body });
            setBody("");
            setPage(1);
            setData(await api(`conversations/${conversationId}`));
            setError("");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <input
          aria-label="Your message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={2000}
          placeholder="Write a message…"
        />
        <button className="button">
          <T en="Send" bn="পাঠান" />
        </button>
      </form>
      {error && <Notice error>{error}</Notice>}
      <div className="inline-actions">
        {target && (
          <>
            <Action path={`blocks/${target}`}>Block member</Action>
            <Action path={`blocks/${target}`} method="DELETE">
              Unblock member
            </Action>
          </>
        )}
      </div>
      <ReportForm targetType="CONVERSATION" targetId={conversationId} />
    </div>
  );
}
export function Compare() {
  const [items, setItems] = useState<PublicListing[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    const ids: { id: string }[] = JSON.parse(
      localStorage.getItem("compare") || "[]",
    );
    Promise.all(
      ids.slice(0, 3).map((x) => api<PublicListing>(`listings/${x.id}`)),
    )
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  if (!items.length)
    return (
      <Empty title="Choose up to three materials to compare">
        <p>Use “Compare” on materials from the same category.</p>
        <Link className="button" href="/browse">
          Browse materials
        </Link>
        {error && <Notice error>{error}</Notice>}
      </Empty>
    );
  const compatible = items.every((i) => i.unit === items[0].unit);
  const rows: [string, (l: PublicListing) => string][] = [
    ["Unit price", (l) => `${money(l.price)} / ${l.unit}`],
    [
      "Price per m²",
      (l) =>
        l.categoryId === "tiles" &&
        l.unit === "box" &&
        l.widthMm &&
        l.lengthMm &&
        l.piecesPerBox
          ? money(
              l.price / ((l.widthMm * l.lengthMm * l.piecesPerBox) / 1000000),
            )
          : "Not reliably comparable",
    ],
    [
      "Available",
      (l) =>
        `${l.lot ? l.lot.total - l.lot.reserved - l.lot.sold : 0} ${l.unit}s`,
    ],
    [
      "Dimensions",
      (l) =>
        l.widthMm && l.lengthMm ? `${l.widthMm} × ${l.lengthMm} mm` : "Unknown",
    ],
    ["Brand", (l) => l.brand || "Unknown"],
    ["Model / code", (l) => l.modelCode || "Unknown"],
    ["Batch / shade", (l) => l.batchCode || "Unknown"],
    ["Finish", (l) => l.finish || "Unknown"],
    ["Condition", (l) => l.condition],
    ["Partial purchase", (l) => (l.partial ? "Allowed" : "Whole lot only")],
    ["Minimum / increment", (l) => `${l.minimum} / ${l.increment} ${l.unit}`],
    ["Pickup area", (l) => l.area],
  ];
  return (
    <>
      {!compatible && (
        <Notice>
          These selling units differ. Unit prices cannot be compared directly.
        </Notice>
      )}
      <div className="table-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Specification</th>
              {items.map((l) => (
                <td key={l.id}>
                  {l.images[0] && (
                    <Image
                      unoptimized
                      src={`/api/v1/media/${l.images[0].id}`}
                      alt={l.title}
                      width={220}
                      height={160}
                    />
                  )}
                  <Link href={`/listings/${l.id}`}>
                    <h3>{l.title}</h3>
                  </Link>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, value]) => (
              <tr key={name}>
                <th>{name}</th>
                {items.map((l) => (
                  <td key={l.id}>{value(l)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        className="button secondary spaced"
        onClick={() => {
          localStorage.removeItem("compare");
          setItems([]);
        }}
      >
        Clear comparison
      </button>
      <p className="hint">
        Area prices use seller-declared dimensions and pieces per box. Unknown
        measurements are not inferred.
      </p>
    </>
  );
}
