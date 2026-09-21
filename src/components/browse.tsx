"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, T, useLocale, api, Notice } from "./ui";
import { categories } from "@/lib/format";
export function SearchFilters({
  values,
}: {
  values: Record<string, string | number>;
}) {
  const [open, setOpen] = useState(false),
    locale = useLocale();
  return (
    <>
      <button
        className="button secondary mobile-filter"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon name="SlidersHorizontal" />
        <T en="Filters" bn="ফিল্টার" />
      </button>
      <form action="/browse" className={`filters ${open ? "open" : ""}`}>
        <h3>
          <T en="Find your match" bn="পছন্দের উপকরণ খুঁজুন" />
        </h3>
        <label className="field">
          <span>
            <T en="Search materials" bn="উপকরণ খুঁজুন" />
          </span>
          <input
            name="q"
            defaultValue={values.q}
            placeholder={
              locale === "bn" ? "নাম বা মডেল কোড" : "Name or material code"
            }
          />
        </label>
        <label className="field">
          <span>
            <T en="Category" bn="বিভাগ" />
          </span>
          <select name="category" defaultValue={values.category}>
            <option value="">
              {locale === "bn" ? "সব বিভাগ" : "All categories"}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "bn" ? c.bn : c.en}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>
            <T en="Pickup area" bn="পিকআপ এলাকা" />
          </span>
          <input
            name="area"
            defaultValue={values.area}
            placeholder="Dhaka area"
          />
        </label>
        <label className="field">
          <span>
            <T en="Condition" bn="অবস্থা" />
          </span>
          <select name="condition" defaultValue={values.condition}>
            <option value="">
              {locale === "bn" ? "যেকোনো" : "Any condition"}
            </option>
            <option value="UNOPENED">Unopened</option>
            <option value="UNUSED">Unused</option>
            <option value="USED_GOOD">Used · good</option>
          </select>
        </label>
        {[
          ["min", "Minimum price (৳)", "সর্বনিম্ন দাম (৳)"],
          ["max", "Maximum price (৳)", "সর্বোচ্চ দাম (৳)"],
          ["quantity", "Quantity needed", "প্রয়োজনীয় পরিমাণ"],
          ["width", "Width (mm)", "প্রস্থ (মিমি)"],
          ["length", "Length (mm)", "দৈর্ঘ্য (মিমি)"],
          ["brand", "Brand", "ব্র্যান্ড"],
          ["model", "Model / code", "মডেল / কোড"],
          ["finish", "Finish", "ফিনিশ"],
        ].map(([name, en, bn]) => (
          <label className="field" key={name}>
            <span>
              <T en={en} bn={bn} />
            </span>
            <input
              name={name}
              type={
                ["min", "max", "quantity", "width", "length"].includes(name)
                  ? "number"
                  : "text"
              }
              min="0"
              defaultValue={values[name] || ""}
            />
          </label>
        ))}
        <label className="check-label">
          <input
            type="checkbox"
            name="partial"
            value="true"
            defaultChecked={values.partial === "true"}
          />
          <T en="Partial lots available" bn="আংশিক লট পাওয়া যায়" />
        </label>
        <button className="button full">
          <T en="Apply filters" bn="ফিল্টার প্রয়োগ করুন" />
        </button>
        <Link className="text-button" href="/browse">
          <T en="Clear filters" bn="ফিল্টার মুছুন" />
        </Link>
      </form>
    </>
  );
}
export function BrowseToolbar({
  total,
  filters,
}: {
  total: number;
  filters: Record<string, string | number>;
}) {
  const router = useRouter(),
    [notice, setNotice] = useState("");
  return (
    <>
      <div className="browse-toolbar">
        <span>
          {total} <T en="materials to build with" bn="উপকরণ পাওয়া গেছে" />
        </span>
        <div className="inline-actions">
          <button
            className="text-link"
            style={{ border: 0, background: "none" }}
            onClick={async () => {
              try {
                await api("searches", "POST", {
                  label: String(
                    filters.q || filters.category || "Dhaka materials",
                  ),
                  filters,
                });
                setNotice("Search saved. Manage email alerts in your profile.");
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            <Icon name="Bookmark" size={16} />
            <T en="Save search" bn="অনুসন্ধান সংরক্ষণ" />
          </button>
          <label>
            <span className="visually-hidden">Sort listings</span>
            <select
              value={filters.sort}
              onChange={(e) => {
                const p = new URLSearchParams(window.location.search);
                p.set("sort", e.target.value);
                p.delete("page");
                router.push(`/browse?${p}`);
              }}
            >
              <option value="recent">Newest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>
      {notice && <Notice>{notice}</Notice>}
    </>
  );
}
