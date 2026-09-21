"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { categories } from "@/lib/format";
import { listingSchema } from "@/lib/validation";
import { api, T, Notice, useLocale } from "./ui";
type Fields = Record<string, string | boolean>;
const initialFields: Fields = {
  title: "",
  description: "",
  categoryId: "tiles",
  condition: "UNOPENED",
  price: "",
  unit: "box",
  total: "",
  minimum: "1",
  increment: "1",
  partial: true,
  area: "Dhanmondi",
  district: "Dhaka",
  pickupNotes: "",
  privatePickup: "",
  disclosures: "",
  brand: "",
  modelCode: "",
  batchCode: "",
  widthMm: "",
  lengthMm: "",
  thicknessMm: "",
  weightGrams: "",
  finish: "",
  colour: "",
  piecesPerBox: "",
  material: "",
};
type Editable = {
  id: string;
  images: { id: string; alt: string }[];
  lot: { total: number } | null;
} & Record<string, unknown>;
export function ListingForm({
  userId,
  initial,
}: {
  userId: string;
  initial?: Editable;
}) {
  const router = useRouter(),
    locale = useLocale(),
    draftKey = `listing-draft:${userId}:${initial?.id || "new"}`;
  const [fields, setFields] = useState<Fields>(() => {
    if (!initial) return initialFields;
    return Object.fromEntries(
      Object.keys(initialFields).map((k) => [
        k,
        k === "total"
          ? String(initial.lot?.total || "")
          : k === "price"
            ? String(Number(initial.price) / 100)
            : k === "partial"
              ? Boolean(initial.partial)
              : String(initial[k] ?? ""),
      ]),
    );
  });
  const [images, setImages] = useState<{ id: string; alt: string }[]>(
      initial?.images || [],
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [invalid, setInvalid] = useState<string[]>([]),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!initial) {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const d = JSON.parse(saved);
          setFields(d.fields);
          setImages(d.images || []);
        } catch {
          localStorage.removeItem(draftKey);
        }
      }
    }
    setLoaded(true);
  }, [draftKey, initial]);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(draftKey, JSON.stringify({ fields, images }));
  }, [fields, images, loaded, draftKey]);
  const change = (name: string, value: string | boolean) =>
    setFields({ ...fields, [name]: value });
  const field = (
    name: string,
    en: string,
    bn: string,
    type = "text",
    required = false,
  ) => (
    <label className="field" key={name}>
      <span>
        <T en={en} bn={bn} />
        {required ? " *" : ""}
      </span>
      {type === "textarea" ? (
        <textarea
          value={String(fields[name])}
          onChange={(e) => change(name, e.target.value)}
          required={required}
          maxLength={name === "description" ? 4000 : 1000}
        />
      ) : (
        <input
          type={type}
          value={String(fields[name])}
          onChange={(e) => change(name, e.target.value)}
          required={required}
          min={type === "number" ? "0" : undefined}
          step={name === "price" ? "0.01" : "1"}
          maxLength={140}
          aria-invalid={invalid.includes(name)}
        />
      )}{" "}
      {invalid.includes(name) && (
        <small className="form-error">
          <T en="Check this value." bn="সঠিক মান দিন।" />
        </small>
      )}
    </label>
  );
  async function save(publish: boolean) {
    setBusy(true);
    setError("");
    const payload: Record<string, unknown> = {
      ...fields,
      imageIds: images.map((i) => i.id),
    };
    for (const key of [
      "total",
      "minimum",
      "increment",
      "widthMm",
      "lengthMm",
      "thicknessMm",
      "weightGrams",
      "piecesPerBox",
    ])
      payload[key] = fields[key] === "" ? null : Number(fields[key]);
    payload.price = Math.round(Number(fields.price) * 100);
    const parsed = listingSchema.safeParse(payload);
    if (!parsed.success) {
      setInvalid(parsed.error.issues.map((i) => String(i.path[0])));
      setError(
        locale === "bn"
          ? "চিহ্নিত ঘরগুলো ঠিক করুন।"
          : "Please check the highlighted fields.",
      );
      setBusy(false);
      return;
    }
    try {
      const l = await api<{ id: string }>(
        initial ? `listings/${initial.id}` : "listings",
        initial ? "PUT" : "POST",
        parsed.data,
      );
      if (publish) await api(`listings/${l.id}/publish`, "POST", {});
      localStorage.removeItem(draftKey);
      router.push("/dashboard/listings");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="panel medium"
      onSubmit={(e) => {
        e.preventDefault();
        void save(true);
      }}
    >
      <div className="form-progress">
        <span>
          01 <T en="Material" bn="উপকরণ" />
        </span>
        <span>
          02 <T en="Quantity & price" bn="পরিমাণ ও দাম" />
        </span>
        <span>
          03 <T en="Photos & pickup" bn="ছবি ও পিকআপ" />
        </span>
        <span>
          <T en="Draft saved on this device" bn="এই ডিভাইসে খসড়া সংরক্ষিত" />
        </span>
      </div>
      <section className="form-section">
        <h2>
          <T en="Tell us about your material" bn="উপকরণের বিবরণ দিন" />
        </h2>
        <div className="field-row">
          <label className="field">
            <span>
              <T en="Category" bn="বিভাগ" /> *
            </span>
            <select
              value={String(fields.categoryId)}
              onChange={(e) => change("categoryId", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "bn" ? c.bn : c.en}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>
              <T en="Condition" bn="অবস্থা" /> *
            </span>
            <select
              value={String(fields.condition)}
              onChange={(e) => change("condition", e.target.value)}
            >
              <option value="UNOPENED">Unopened</option>
              <option value="UNUSED">Unused</option>
              <option value="USED_GOOD">Used · good</option>
            </select>
          </label>
        </div>
        {field("title", "Listing title", "বিজ্ঞাপনের শিরোনাম", "text", true)}
        {field("description", "Description", "বিবরণ", "textarea", true)}
        <div className="field-row">
          {field(
            "brand",
            "Brand (leave blank if unknown)",
            "ব্র্যান্ড (অজানা হলে খালি রাখুন)",
          )}
          {field("modelCode", "Model / product code", "মডেল / পণ্যের কোড")}
          {field(
            "widthMm",
            "Width (mm)",
            "প্রস্থ (মিমি)",
            "number",
            ["tiles", "doors", "flooring"].includes(String(fields.categoryId)),
          )}
          {field(
            "lengthMm",
            "Length / height (mm)",
            "দৈর্ঘ্য / উচ্চতা (মিমি)",
            "number",
            ["tiles", "doors", "flooring"].includes(String(fields.categoryId)),
          )}
          {field("finish", "Finish", "ফিনিশ")}
          {field("colour", "Colour", "রং")}
          {field("material", "Material composition", "উপকরণের গঠন")}
          {field(
            "weightGrams",
            "Weight per sale unit (grams)",
            "প্রতি ইউনিটের ওজন (গ্রাম)",
            "number",
          )}
        </div>
        {fields.categoryId === "tiles" && (
          <div className="field-row">
            {field(
              "batchCode",
              "Batch / shade code (if known)",
              "ব্যাচ / শেড কোড (জানা থাকলে)",
            )}
            {field(
              "piecesPerBox",
              "Pieces per box",
              "প্রতি বাক্সে সংখ্যা",
              "number",
              fields.unit === "box",
            )}
          </div>
        )}
        <p className="hint">
          <T
            en="Keep different batches in separate listings. Unknown fields stay unknown."
            bn="ভিন্ন ব্যাচ আলাদা বিজ্ঞাপনে দিন। অজানা তথ্য অজানাই থাকবে।"
          />
        </p>
      </section>
      <section className="form-section">
        <h2>
          <T en="Quantity & asking price" bn="পরিমাণ ও চাওয়া দাম" />
        </h2>
        <div className="field-row">
          {field(
            "price",
            "Price per sale unit (৳)",
            "প্রতি ইউনিট মূল্য (৳)",
            "number",
            true,
          )}
          <label className="field">
            <span>
              <T en="Sale unit" bn="বিক্রয়ের একক" /> *
            </span>
            <select
              value={String(fields.unit)}
              onChange={(e) => change("unit", e.target.value)}
            >
              {["box", "piece", "set", "pack"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          {field(
            "total",
            "Total quantity in this lot",
            "এই লটে মোট পরিমাণ",
            "number",
            true,
          )}
          {field(
            "minimum",
            "Minimum purchase quantity",
            "সর্বনিম্ন ক্রয় পরিমাণ",
            "number",
            true,
          )}
          {field(
            "increment",
            "Sale increment",
            "বিক্রয়ের ধাপ",
            "number",
            true,
          )}
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={Boolean(fields.partial)}
            onChange={(e) => change("partial", e.target.checked)}
          />
          <T
            en="Allow buyers to purchase part of this lot"
            bn="ক্রেতাদের আংশিক লট কেনার অনুমতি দিন"
          />
        </label>
      </section>
      <section className="form-section">
        <h2>
          <T en="Photographs" bn="ছবি" />
        </h2>
        <p className="hint">
          <T
            en="Up to 8 JPEG, PNG or WebP images, under 8 MB each. Include labels, batch codes and any damage."
            bn="সর্বোচ্চ ৮টি JPEG, PNG বা WebP ছবি, প্রতিটি ৮ মেগাবাইটের কম। লেবেল, ব্যাচ কোড ও ক্ষতির ছবি দিন।"
          />
        </p>
        <div className="file-list">
          {images.map((img) => (
            <div key={img.id} className="upload-preview">
              <Image
                unoptimized
                src={`/api/v1/media/${img.id}`}
                width={110}
                height={85}
                alt={img.alt}
              />
              <button
                type="button"
                onClick={() => setImages(images.filter((i) => i.id !== img.id))}
              >
                <T en="Remove" bn="সরান" />
              </button>
            </div>
          ))}
        </div>
        <label className="field">
          <span>
            <T en="Add a photo" bn="ছবি যোগ করুন" />
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={images.length >= 8 || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const form = new FormData();
                form.set("file", file);
                form.set("alt", String(fields.title || "Material photograph"));
                const upload = await api<{ id: string; alt: string }>(
                  "uploads",
                  "POST",
                  form,
                );
                setImages([...images, upload]);
                setMessage(
                  locale === "bn" ? "ছবি যোগ হয়েছে।" : "Photo added.",
                );
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      </section>
      <section className="form-section">
        <h2>
          <T en="Pickup & disclosures" bn="পিকআপ ও ঘোষণা" />
        </h2>
        <div className="field-row">
          {field("area", "Public area", "সাধারণ এলাকা", "text", true)}
          {field("district", "District", "জেলা", "text", true)}
        </div>
        {field(
          "pickupNotes",
          "Pickup arrangements & access notes (public)",
          "পিকআপ ব্যবস্থা (সবার জন্য)",
          "textarea",
          true,
        )}
        {field(
          "privatePickup",
          "Exact pickup address (order participants only)",
          "সঠিক পিকআপ ঠিকানা (শুধু অর্ডারের পক্ষদের জন্য)",
          "textarea",
          true,
        )}
        {field(
          "disclosures",
          "Condition, defects and safety disclosures",
          "অবস্থা, ত্রুটি ও নিরাপত্তার ঘোষণা",
          "textarea",
          true,
        )}
      </section>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="inline-actions">
        <button className="button" disabled={busy}>
          <T
            en={busy ? "Saving…" : "Submit for review"}
            bn={busy ? "সংরক্ষণ হচ্ছে…" : "পর্যালোচনার জন্য জমা দিন"}
          />
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => void save(false)}
        >
          <T en="Save draft" bn="খসড়া সংরক্ষণ" />
        </button>
      </div>
      <p className="hint">
        <T
          en="Your listing appears in the marketplace after moderation. Edits to published listings require another review."
          bn="পর্যালোচনার পর বিজ্ঞাপন বাজারে দেখা যাবে। প্রকাশিত বিজ্ঞাপনে সম্পাদনার পর আবার পর্যালোচনা হবে।"
        />
      </p>
    </form>
  );
}
