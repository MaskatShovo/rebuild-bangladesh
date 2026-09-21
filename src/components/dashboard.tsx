"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { dashboard } from "@/lib/marketplace";
import { ListingCard } from "./cards";
import { authClient } from "./auth-form";
import { api, Action, T, Notice, Empty, Icon, useLocale } from "./ui";
import { money, date, unitLabel } from "@/lib/format";
type DashboardData = Awaited<ReturnType<typeof dashboard>>;
export function Dashboard({
  data: d,
  section,
}: {
  data: DashboardData;
  section: string;
}) {
  const [notice, setNotice] = useState("");
  const router = useRouter(),
    locale = useLocale();
  const nav = [
    ["overview", "Overview", "সংক্ষিপ্ত বিবরণ", "Grid2X2"],
    ["listings", "My listings", "আমার বিজ্ঞাপন", "Layers"],
    ["orders", "Requests & orders", "অনুরোধ ও অর্ডার", "Bookmark"],
    ["messages", "Messages", "বার্তা", "MessageCircle"],
    ["saved", "Saved materials", "সংরক্ষিত উপকরণ", "Heart"],
    ["wanted", "My wanted requests", "আমার চাহিদা", "Search"],
    ["notifications", "Notifications", "বিজ্ঞপ্তি", "Bell"],
    [
      "profile",
      "Profile & security",
      "প্রোফাইল ও নিরাপত্তা",
      "CircleUserRound",
    ],
  ] as const;
  const title = nav.find((n) => n[0] === section);
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-nav">
        {nav.map(([key, en, bn, icon]) => (
          <Link
            className={section === key ? "active" : ""}
            key={key}
            href={`/dashboard/${key}`}
          >
            <Icon name={icon} />
            <T en={en} bn={bn} />
          </Link>
        ))}
        {["ADMIN", "MODERATOR"].includes(d.user.role) && (
          <Link href="/admin">
            <Icon name="ShieldCheck" />
            <T en="Moderation" bn="পর্যালোচনা" />
          </Link>
        )}
        <button
          className="text-button"
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <T en="Sign out" bn="সাইন আউট" />
        </button>
      </aside>
      <section>
        <div className="dashboard-heading">
          <h1>
            {title ? (
              <T en={title[1]} bn={title[2]} />
            ) : (
              <T en="Overview" bn="সংক্ষিপ্ত বিবরণ" />
            )}
          </h1>
          <Link href="/sell" className="button">
            <Icon name="Plus" size={16} />
            <T en="New listing" bn="নতুন বিজ্ঞাপন" />
          </Link>
        </div>
        {notice && <Notice>{notice}</Notice>}
        {section === "overview" && (
          <>
            <p>
              <T
                en={`Welcome back, ${d.user.name.split(" ")[0]}. Keep your next project moving.`}
                bn={`স্বাগতম, ${d.user.name.split(" ")[0]}। আপনার কাজ এগিয়ে নিন।`}
              />
            </p>
            <div className="stats-grid">
              <div className="stat">
                <strong>
                  {d.listings.filter((l) => l.status === "APPROVED").length}
                </strong>
                <span>
                  <T en="Active listings" bn="সক্রিয় বিজ্ঞাপন" />
                </span>
              </div>
              <div className="stat">
                <strong>
                  {
                    d.orders.filter((o) =>
                      ["PENDING", "ACCEPTED", "READY"].includes(o.status),
                    ).length
                  }
                </strong>
                <span>
                  <T en="Open requests & orders" bn="চলমান অনুরোধ ও অর্ডার" />
                </span>
              </div>
              <div className="stat">
                <strong>
                  {
                    d.orders.filter(
                      (o) =>
                        o.status === "COMPLETED" && o.sellerId === d.user.id,
                    ).length
                  }
                </strong>
                <span>
                  <T en="Completed sales" bn="সম্পন্ন বিক্রয়" />
                </span>
              </div>
            </div>
            <h3>
              <T en="Recent activity" bn="সাম্প্রতিক কার্যক্রম" />
            </h3>
            {d.orders.slice(0, 4).map((o) => (
              <OrderRow key={o.id} order={o} userId={d.user.id} />
            ))}
            {!d.orders.length && (
              <Empty
                title={
                  locale === "bn"
                    ? "এখনো কোনো অর্ডার নেই"
                    : "Your next project starts with a good find"
                }
              >
                <Link className="button" href="/browse">
                  <T en="Explore materials" bn="উপকরণ দেখুন" />
                </Link>
              </Empty>
            )}
            <p className="hint spaced">
              <T
                en="Completed sales count handovers confirmed by both parties. Material payments go directly to the seller; ReBuild collects no material-purchase funds."
                bn="উভয় পক্ষের নিশ্চিত হস্তান্তর সম্পন্ন বিক্রয় হিসাবে গণনা হয়। উপকরণের মূল্য সরাসরি বিক্রেতাকে দিন।"
              />
            </p>
          </>
        )}
        {section === "listings" && (
          <>
            {d.listings.map((l) => (
              <article key={l.id} className="row-card">
                <div className="row-top">
                  <div>
                    <h3>{l.title}</h3>
                    <p>
                      {money(l.price)} / {l.unit} ·{" "}
                      {l.lot ? l.lot.total - l.lot.reserved - l.lot.sold : 0}{" "}
                      available · {l.lot?.reserved || 0} reserved ·{" "}
                      {l.lot?.sold || 0} sold
                    </p>
                  </div>
                  <span className={`status ${l.status}`}>{l.status}</span>
                </div>
                {l.moderationReason && <Notice>{l.moderationReason}</Notice>}
                <div className="inline-actions">
                  <Link
                    className="button secondary small"
                    href={`/sell?edit=${l.id}`}
                  >
                    <T en="Edit" bn="সম্পাদনা" />
                  </Link>
                  {l.status === "APPROVED" && (
                    <>
                      <Link
                        href={`/listings/${l.id}`}
                        className="button secondary small"
                      >
                        <T en="View" bn="দেখুন" />
                      </Link>
                      <Action path={`listings/${l.id}/pause`}>
                        <T en="Pause" bn="বিরতি" />
                      </Action>
                      {d.capabilities.promotionPayments && (
                        <button
                          className="button secondary small"
                          onClick={async () => {
                            try {
                              const payment = await api<{
                                id: string;
                                checkoutUrl?: string;
                              }>(
                                "payments",
                                "POST",
                                { listingId: l.id },
                                crypto.randomUUID(),
                              );
                              if (payment.checkoutUrl) {
                                window.location.assign(payment.checkoutUrl);
                                return;
                              }
                              router.push("/dashboard/promotions");
                              router.refresh();
                            } catch (e) {
                              setNotice((e as Error).message);
                            }
                          }}
                        >
                          <T
                            en="Feature for 7 days · ৳199"
                            bn="৭ দিনের প্রচার · ৳১৯৯"
                          />
                        </button>
                      )}
                    </>
                  )}
                  {["DRAFT", "PAUSED", "REJECTED"].includes(l.status) && (
                    <Action path={`listings/${l.id}/publish`}>
                      <T en="Submit for review" bn="পর্যালোচনায় জমা দিন" />
                    </Action>
                  )}
                  {l.status !== "ARCHIVED" && (
                    <Action path={`listings/${l.id}/archive`}>
                      <T en="Archive" bn="আর্কাইভ" />
                    </Action>
                  )}
                </div>
              </article>
            ))}
            {!d.listings.length && (
              <Empty title="You have not listed any materials yet">
                <Link className="button" href="/sell">
                  Create your first listing
                </Link>
              </Empty>
            )}
            <Link className="text-link" href="/dashboard/promotions">
              Promotion purchases →
            </Link>
          </>
        )}
        {section === "orders" && (
          <>
            {d.orders.map((o) => (
              <OrderRow key={o.id} order={o} userId={d.user.id} />
            ))}
            {!d.orders.length && <Empty title="No purchase requests yet" />}
          </>
        )}
        {section === "messages" && (
          <>
            {d.conversations.map((c) => {
              const last = c.messages[0];
              const unread =
                last &&
                last.senderId !== d.user.id &&
                new Date(last.createdAt) >
                  new Date(
                    c.buyerId === d.user.id ? c.buyerReadAt : c.sellerReadAt,
                  );
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="row-card"
                  style={{ display: "block" }}
                >
                  <div className="row-top">
                    <h3>
                      {c.buyerId === d.user.id ? c.seller.name : c.buyer.name}
                    </h3>
                    {unread && <span className="status">New message</span>}
                  </div>
                  <p>{c.listing.title}</p>
                  <p>{last?.body.slice(0, 120) || "Start a conversation"}</p>
                </Link>
              );
            })}
            {!d.conversations.length && (
              <Empty title="Your conversations will appear here">
                <p>Open a listing and send the seller a question.</p>
              </Empty>
            )}
          </>
        )}
        {section === "saved" && (
          <>
            <div
              className="listing-grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              }}
            >
              {d.saves.map((l) => (
                <ListingCard key={l.id} listing={l} initiallySaved />
              ))}
            </div>
            {!d.saves.length && (
              <Empty title="Save materials for your next project" />
            )}
            <h3 className="spaced">
              <T en="Saved searches" bn="সংরক্ষিত অনুসন্ধান" />
            </h3>
            {d.searches.map((s) => (
              <div className="row-card" key={s.id}>
                <h3>{s.label}</h3>
                <Link
                  className="text-link"
                  href={`/browse?${new URLSearchParams(Object.entries(s.filters as Record<string, string | number>).map(([k, v]) => [k, String(v)]))}`}
                >
                  Run search →
                </Link>
                <div className="inline-actions">
                  <Action path={`searches/${s.id}`} method="DELETE">
                    Remove search
                  </Action>
                </div>
              </div>
            ))}
          </>
        )}
        {section === "wanted" && (
          <>
            <Link className="button spaced" href="/wanted/new">
              <T en="Post a wanted request" bn="চাহিদা জানান" />
            </Link>
            {d.wanted.map((w) => (
              <div className="row-card" key={w.id}>
                <h3>{w.title}</h3>
                <p>
                  {w.quantity} {unitLabel(w.unit, w.quantity, locale)} ·{" "}
                  {w.area} · {w.closed ? "Closed" : "Open"}
                </p>
                <div className="inline-actions">
                  <Link className="button secondary" href={`/wanted/${w.id}`}>
                    View matches
                  </Link>
                  {!w.closed && (
                    <Action path={`wanted/${w.id}`} method="DELETE">
                      Close request
                    </Action>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        {section === "notifications" && (
          <>
            <Action path="notifications">
              <T en="Mark all as read" bn="সব পড়া হয়েছে চিহ্নিত করুন" />
            </Action>
            <div className="spaced">
              {d.notifications.map((n) => (
                <Link
                  onClick={() => void api(`notifications/${n.id}`, "POST", {})}
                  href={n.href}
                  className="row-card"
                  style={{ display: "block" }}
                  key={n.id}
                >
                  <div className="row-top">
                    <h3>{locale === "bn" ? n.titleBn : n.title}</h3>
                    {!n.readAt && <span className="status">New</span>}
                  </div>
                  <p>{date(n.createdAt)}</p>
                </Link>
              ))}
            </div>
            {!d.notifications.length && <Empty title="You’re all caught up" />}
          </>
        )}
        {section === "profile" && <Profile user={d.user} />}
        {section === "promotions" && (
          <>
            {d.capabilities.paymentSimulator ? (
              <Notice>
                <T
                  en="Development payment simulator. No real money is charged. Promotion: ৳199 for 7 days. A success page never activates a placement."
                  bn="ডেভেলপমেন্ট পেমেন্ট সিমুলেটর। আসল টাকা কাটা হয় না। প্রচার: ৭ দিনের জন্য ৳১৯৯।"
                />
              </Notice>
            ) : (
              <Notice>
                Promotion status is confirmed by the payment provider.{" "}
                {d.capabilities.promotionPayments
                  ? "Sandbox payments are configured."
                  : "Online promotion payments are not configured; free listings remain available."}
              </Notice>
            )}
            {d.payments.map((p) => (
              <div className="row-card" key={p.id}>
                <h3>
                  {money(p.amount)} · {p.state}
                </h3>
                <p>{p.id}</p>
                {p.promotion && (
                  <p>
                    Placement ends {date(p.promotion.expiresAt)} ·{" "}
                    {p.promotion.active ? "active" : "inactive"}
                  </p>
                )}
                {d.capabilities.paymentSimulator &&
                  p.provider === "simulator" && (
                    <div className="inline-actions">
                      {(
                        ["SUCCESS", "FAILED", "CANCELLED", "REFUNDED"] as const
                      ).map((state) => (
                        <Action
                          key={state}
                          path={`payments/${p.id}/simulate`}
                          body={{ state, eventId: `${p.id}-${state}` }}
                        >
                          {state === "SUCCESS"
                            ? "Simulate success / duplicate"
                            : `Simulate ${state.toLowerCase()}`}
                        </Action>
                      ))}
                    </div>
                  )}
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
function OrderRow({
  order: o,
  userId,
}: {
  order: DashboardData["orders"][number];
  userId: string;
}) {
  return (
    <Link
      className="row-card"
      style={{ display: "block" }}
      href={`/orders/${o.id}`}
    >
      <div className="row-top">
        <div>
          <h3>{o.titleSnapshot}</h3>
          <p>
            {o.quantity} {unitLabel(o.unitSnapshot, o.quantity)} ·{" "}
            {money(o.totalPrice)} ·{" "}
            {o.buyerId === userId ? "Buying" : "Selling"}
          </p>
        </div>
        <span className={`status ${o.status}`}>{o.status}</span>
      </div>
      <span className="text-link">Manage request →</span>
    </Link>
  );
}
function Profile({ user }: { user: DashboardData["user"] }) {
  const [message, setMessage] = useState(""),
    [sessions, setSessions] = useState<
      {
        id: string;
        token: string;
        userAgent?: string | null;
        createdAt: Date;
      }[]
    >([]),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="panel">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await api("me", "PATCH", {
              name: f.get("name"),
              sellerName: f.get("sellerName") || null,
              bio: f.get("bio") || null,
              area: f.get("area"),
              phone: f.get("phone") || "",
              locale: f.get("locale"),
              emailAlerts: f.has("emailAlerts"),
            });
            setMessage("Profile saved.");
            router.refresh();
          } catch (err) {
            setMessage((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="field-row">
          <label className="field">
            <span>
              <T en="Your name" bn="আপনার নাম" />
            </span>
            <input
              name="name"
              defaultValue={user.name}
              required
              minLength={2}
            />
          </label>
          <label className="field">
            <span>
              <T en="Seller display name" bn="বিক্রেতার নাম" />
            </span>
            <input
              name="sellerName"
              defaultValue={user.sellerName || ""}
              minLength={2}
            />
            <small>
              <T
                en="Add a seller name to start listing materials."
                bn="বিজ্ঞাপন দিতে বিক্রেতার নাম যোগ করুন।"
              />
            </small>
          </label>
        </div>
        <label className="field">
          <span>
            <T en="About you" bn="আপনার পরিচয়" />
          </span>
          <textarea name="bio" defaultValue={user.bio || ""} maxLength={1000} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>
              <T en="Area" bn="এলাকা" />
            </span>
            <input name="area" defaultValue={user.area} required />
          </label>
          <label className="field">
            <span>
              <T
                en="Phone (private, unverified)"
                bn="ফোন (ব্যক্তিগত, যাচাই করা নয়)"
              />
            </span>
            <input
              name="phone"
              defaultValue={user.phone || ""}
              placeholder="01XXXXXXXXX"
            />
          </label>
        </div>
        <label className="field">
          <span>
            <T en="Email language" bn="ইমেইলের ভাষা" />
          </span>
          <select name="locale" defaultValue={user.locale}>
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="emailAlerts"
            defaultChecked={user.emailAlerts}
          />
          <T
            en="Email me when a saved search matches new materials"
            bn="সংরক্ষিত অনুসন্ধানে নতুন মিল হলে ইমেইল পাঠান"
          />
        </label>
        <button className="button" disabled={busy}>
          <T en="Save profile" bn="প্রোফাইল সংরক্ষণ" />
        </button>
      </form>
      {message && <Notice>{message}</Notice>}
      <div className="detail-section">
        <h2>
          <T en="Account security" bn="অ্যাকাউন্ট নিরাপত্তা" />
        </h2>
        <p>
          {user.email} ·{" "}
          {user.emailVerified ? "Email verified" : "Verification needed"}
        </p>
        <div className="inline-actions">
          <Link className="button secondary" href="/auth">
            Password reset / verification
          </Link>
          <button
            className="button secondary"
            onClick={async () => {
              const result = await authClient.listSessions();
              if (result.data) setSessions(result.data);
              else
                setMessage(result.error?.message || "Could not load sessions");
            }}
          >
            View active sessions
          </button>
          <button
            className="button secondary"
            onClick={async () => {
              await authClient.revokeOtherSessions();
              setMessage("Other sessions revoked.");
              setSessions([]);
            }}
          >
            Revoke other sessions
          </button>
        </div>
        {sessions.map((s) => (
          <div className="row-card" key={s.id}>
            <p>
              {s.userAgent || "Browser session"} · {date(s.createdAt)}
            </p>
            <button
              className="button secondary small"
              onClick={async () => {
                await authClient.revokeSession({ token: s.token });
                setSessions(sessions.filter((x) => x.id !== s.id));
                router.refresh();
              }}
            >
              Revoke this session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
