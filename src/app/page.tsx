import { unitLabel } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { searchListings } from "@/lib/listings";
import { Icon, T } from "@/components/ui";
import { ListingCard } from "@/components/cards";
import { categories } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [result, wanted, counts, catalog] = await Promise.all([
    searchListings({}),
    db.wanted.findMany({
      where: { closed: false, user: { suspended: false } },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    db.listing.groupBy({
      by: ["categoryId"],
      where: { status: "APPROVED", seller: { suspended: false } },
      _count: true,
    }),
    db.category.findMany({ where: { active: true } }),
  ]);
  const categoryIcons = [
    "Grid2X2",
    "Bath",
    "DoorOpen",
    "Lamp",
    "Layers",
    "Wrench",
  ] as const;
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />{" "}
            <T
              en="LESS WASTE. MORE POSSIBILITY."
              bn="কম অপচয়। আরও সম্ভাবনা।"
            />
          </div>
          <h1>
            <T en="Left over." bn="অবশিষ্ট উপকরণ।" />
            <br />
            <span>
              <T en="Not left behind." bn="নতুন সম্ভাবনা।" />
            </span>
          </h1>
          <p>
            <T
              en="Great materials still have a job to do. Find renovation leftovers for your next project, or give yours a new beginning."
              bn="ভালো উপকরণ আবার কাজে লাগুক। আপনার পরবর্তী কাজের জন্য উপকরণ খুঁজুন, অথবা অবশিষ্ট উপকরণ বিক্রি করুন।"
            />
          </p>
          <form action="/browse" className="hero-search">
            <div className="search-input">
              <Icon name="Search" />
              <input
                aria-label="Search materials"
                name="q"
                placeholder="Tiles, doors, a specific material code…"
              />
            </div>
            <div className="search-lower">
              <label>
                <Icon name="MapPin" size={17} />
                <select name="area" aria-label="Pickup area">
                  <option value="">All Dhaka</option>
                  <option>Dhanmondi</option>
                  <option>Mirpur</option>
                  <option>Uttara</option>
                  <option>Gulshan</option>
                  <option>Bashundhara</option>
                  <option>Mohammadpur</option>
                </select>
              </label>
              <button className="button" type="submit">
                <T en="Find materials" bn="উপকরণ খুঁজুন" />
                <Icon name="ArrowRight" size={17} />
              </button>
            </div>
          </form>
          <div className="hero-note">
            <span>
              <Icon name="Check" size={16} />
              <T en="Free to list" bn="বিনামূল্যে বিজ্ঞাপন" />
            </span>
            <span>
              <Icon name="Check" size={16} />
              <T en="Pay at pickup" bn="পিকআপে মূল্য দিন" />
            </span>
            <span>
              <Icon name="Check" size={16} />
              <T en="Buy a partial lot" bn="আংশিক লট কিনুন" />
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/materials/hero.jpg"
            alt="Warm natural materials and thoughtful interior details"
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width: 800px) 100vw, 48vw"
          />
          <div className="hero-image-shade" />
          <span className="image-label">
            <span />{" "}
            <T en="MAKE ROOM FOR SOMETHING NEW" bn="নতুন কিছুর জায়গা হোক" />
          </span>
          <div className="material-tag">
            <div className="tag-icon">
              <Icon name="Layers" size={25} />
            </div>
            <div>
              <strong>
                <T en="Someone’s extra." bn="কারও অবশিষ্ট।" />
              </strong>
              <span>
                <T en="Your perfect find." bn="আপনার প্রয়োজনের উপকরণ।" />
              </span>
            </div>
            <span className="tag-arrow">↗</span>
          </div>
        </div>
      </section>
      <section className="categories container">
        <div className="section-heading">
          <h2>
            <T en="What are you working on?" bn="কোন উপকরণ খুঁজছেন?" />
          </h2>
          <Link href="/browse" className="text-link">
            <T en="Browse all materials" bn="সব উপকরণ দেখুন" />
            <Icon name="ArrowUpRight" size={18} />
          </Link>
        </div>
        <div className="category-grid">
          {categories
            .filter((c) => catalog.some((item) => item.id === c.id))
            .map((c) => (
              <Link
                key={c.id}
                href={`/browse?category=${c.id}`}
                className="category-tile"
              >
                <span className="category-icon">
                  <Icon
                    name={
                      categoryIcons[
                        categories.findIndex((item) => item.id === c.id)
                      ]
                    }
                    size={29}
                  />
                </span>
                <strong>
                  <T
                    en={catalog.find((item) => item.id === c.id)!.name}
                    bn={catalog.find((item) => item.id === c.id)!.nameBn}
                  />
                </strong>
                <small>
                  {counts.find((x) => x.categoryId === c.id)?._count || 0}{" "}
                  <T en="listings" bn="বিজ্ঞাপন" />
                </small>
              </Link>
            ))}
        </div>
      </section>
      <section className="fresh-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <T en="GOOD FINDS, CLOSE TO HOME" bn="আপনার কাছেই ভালো উপকরণ" />
              </div>
              <h2>
                <T en="Fresh on the marketplace" bn="বাজারে নতুন এসেছে" />
              </h2>
            </div>
            <Link className="text-link" href="/browse">
              <T en="See all listings" bn="সব বিজ্ঞাপন দেখুন" />
              <Icon name="ArrowRight" size={18} />
            </Link>
          </div>
          <div className="listing-grid">
            {result.items.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      </section>
      <section className="wanted-home container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <T en="THE RIGHT MATCH STARTS HERE" bn="সঠিক মিল খুঁজুন এখানেই" />
            </div>
            <h2>
              <T
                en="Someone’s looking for your leftovers"
                bn="আপনার উপকরণই কারও প্রয়োজন"
              />
            </h2>
          </div>
          <Link href="/wanted" className="text-link">
            <T en="Visit the wanted board" bn="চাহিদার বোর্ড দেখুন" />
            <Icon name="ArrowUpRight" size={18} />
          </Link>
        </div>
        <div className="wanted-grid">
          {wanted.map((w) => (
            <Link className="wanted-card" href={`/wanted/${w.id}`} key={w.id}>
              <span className="eyebrow terracotta">
                <T en="WANTED" bn="প্রয়োজন" />
              </span>
              <h3>{w.title}</h3>
              <p>
                {w.quantity} {unitLabel(w.unit, w.quantity)} · {w.area}
              </p>
              <span className="text-link">
                <T en="Have a possible match?" bn="মিল আছে এমন উপকরণ আছে?" />
                <Icon name="ArrowRight" size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="how-strip container">
        <div>
          <span className="step-num">01</span>
          <h3>
            <T en="Find your material" bn="উপকরণ খুঁজুন" />
          </h3>
          <p>
            <T
              en="Match the size, finish, batch and quantity your project needs."
              bn="মাপ, ফিনিশ, ব্যাচ ও পরিমাণ মিলিয়ে নিন।"
            />
          </p>
        </div>
        <div>
          <span className="step-num">02</span>
          <h3>
            <T en="Make a connection" bn="বিক্রেতার সাথে কথা বলুন" />
          </h3>
          <p>
            <T
              en="Ask questions and request the quantity you need."
              bn="প্রশ্ন করুন ও প্রয়োজনীয় পরিমাণের অনুরোধ করুন।"
            />
          </p>
        </div>
        <div>
          <span className="step-num">03</span>
          <h3>
            <T en="Pick up. Build on." bn="পিকআপ করুন। কাজ শুরু করুন।" />
          </h3>
          <p>
            <T
              en="Inspect together, pay the seller and confirm handover."
              bn="একসাথে পরীক্ষা করে মূল্য দিন ও হস্তান্তর নিশ্চিত করুন।"
            />
          </p>
        </div>
      </section>
      <section className="seller-banner container">
        <div>
          <div className="eyebrow">
            <T
              en="YOUR PROJECT’S FINISHED. THEIRS IS JUST BEGINNING."
              bn="আপনার কাজ শেষ। অন্য কারও কাজ শুরু।"
            />
          </div>
          <h2>
            <T
              en="Make space. Pass it on."
              bn="জায়গা খালি করুন। কাজে লাগতে দিন।"
            />
          </h2>
          <p>
            <T
              en="Those extra boxes could be exactly what someone needs."
              bn="বাড়তি বাক্সগুলোই হয়তো কারও প্রয়োজন।"
            />
          </p>
        </div>
        <Link href="/sell" className="button cream">
          <T
            en="List your materials — it’s free"
            bn="বিনামূল্যে বিজ্ঞাপন দিন"
          />
          <Icon name="ArrowUpRight" />
        </Link>
      </section>
    </>
  );
}
