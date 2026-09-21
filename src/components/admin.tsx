"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api, Notice } from "./ui";
import { money, date, categories } from "@/lib/format";
type Data = {
  listings: {
    id: string;
    title: string;
    description: string;
    disclosures: string;
    images: { id: string; alt: string }[];
    seller: { name: string };
  }[];
  reports: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    suspended: boolean;
  }[];
  audit: {
    id: string;
    action: string;
    targetId: string;
    reason: string;
    createdAt: string;
  }[];
  jobs: {
    id: string;
    kind: string;
    attempts: number;
    processedAt: string | null;
    lastError: string | null;
  }[];
  metrics: {
    active: number;
    completed: number;
    completedOrderValue: number;
    materialFundsCollected: number;
  };
};
export function Admin({ admin }: { admin: boolean }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("listings");
  async function load() {
    try {
      setData(await api<Data>("admin"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function mutate(path: string, body: unknown) {
    try {
      await api(path, "POST", body);
      await load();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title">
        <h1>Moderation & operations</h1>
        <p>
          Review material condition, disclosures and reports. Every
          administrative change records a reason.
        </p>
      </div>
      {error && <Notice error>{error}</Notice>}
      {data && (
        <>
          <div className="stats-grid">
            <div className="stat">
              <strong>{data.metrics.active}</strong>
              <span>Approved listings</span>
            </div>
            <div className="stat">
              <strong>{data.metrics.completed}</strong>
              <span>Dual-confirmed handovers</span>
            </div>
            <div className="stat">
              <strong>{money(data.metrics.completedOrderValue)}</strong>
              <span>Completed order value · not platform revenue</span>
            </div>
          </div>
          <Notice>
            Material funds collected by the platform:{" "}
            {money(data.metrics.materialFundsCollected)}. Payment happens
            between buyer and seller at pickup.
          </Notice>
          <nav
            className="dashboard-nav"
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 25 }}
          >
            {[
              "listings",
              "reports",
              "users",
              "categories",
              "audit",
              "jobs",
            ].map((t) => (
              <button
                className={`button ${tab === t ? "" : "secondary"}`}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>
          {tab === "listings" && (
            <>
              {!data.listings.length && <p>The review queue is empty.</p>}
              {data.listings.map((l) => (
                <form
                  key={l.id}
                  className="row-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget),
                      action = f.get("decision");
                    void mutate(`listings/${l.id}/${action}`, {
                      reason: f.get("reason"),
                    });
                  }}
                >
                  <h3>{l.title}</h3>
                  <p>Seller: {l.seller.name}</p>
                  <p>{l.description}</p>
                  <p>Disclosures: {l.disclosures}</p>
                  <div className="file-list">
                    {l.images.map((i) => (
                      <Image
                        key={i.id}
                        unoptimized
                        src={`/api/v1/media/${i.id}`}
                        width={130}
                        height={100}
                        alt={i.alt}
                      />
                    ))}
                  </div>
                  <div className="field-row">
                    <label className="field">
                      <span>Decision</span>
                      <select name="decision">
                        <option value="approve">Approve</option>
                        <option value="reject">
                          Reject / remove from public view
                        </option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Reason visible to seller</span>
                      <input name="reason" required minLength={5} />
                    </label>
                  </div>
                  <button className="button">Record decision</button>
                </form>
              ))}
            </>
          )}
          {tab === "reports" && (
            <>
              {!data.reports.length && <p>No unresolved reports.</p>}
              {data.reports.map((r) => (
                <form
                  className="row-card"
                  key={r.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void mutate(`admin/reports/${r.id}`, {
                      resolution: new FormData(e.currentTarget).get(
                        "resolution",
                      ),
                    });
                  }}
                >
                  <h3>
                    {r.targetType} · {r.targetId}
                  </h3>
                  <p>{r.reason}</p>
                  <label className="field">
                    <span>Resolution and evidence</span>
                    <textarea name="resolution" required minLength={5} />
                  </label>
                  <p className="hint">
                    Resolving a dispute does not restore stock or confirm a
                    refund.
                  </p>
                  <button className="button">Resolve & audit</button>
                </form>
              ))}
            </>
          )}
          {tab === "users" &&
            data.users.map((u) => (
              <form
                className="row-card"
                key={u.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(`admin/users/${u.id}`, {
                    suspended: !u.suspended,
                    reason: new FormData(e.currentTarget).get("reason"),
                  });
                }}
              >
                <h3>{u.name}</h3>
                <p>
                  {u.email} · {u.role} · {u.suspended ? "Suspended" : "Active"}
                </p>
                {admin && (
                  <>
                    <label className="field">
                      <span>Reason</span>
                      <input name="reason" required minLength={5} />
                    </label>
                    <button className="button secondary">
                      {u.suspended
                        ? "Restore capabilities"
                        : "Suspend & revoke sessions"}
                    </button>
                  </>
                )}
              </form>
            ))}
          {tab === "categories" &&
            (admin ? (
              categories.map((c) => (
                <form
                  className="row-card"
                  key={c.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void mutate(`admin/categories/${c.id}`, {
                      name: f.get("name"),
                      nameBn: f.get("nameBn"),
                      active: f.get("active") === "true",
                      reason: f.get("reason"),
                    });
                  }}
                >
                  <h3>{c.id}</h3>
                  <div className="field-row">
                    <label className="field">
                      <span>English name</span>
                      <input name="name" defaultValue={c.en} required />
                    </label>
                    <label className="field">
                      <span>Bangla name</span>
                      <input name="nameBn" defaultValue={c.bn} required />
                    </label>
                    <label className="field">
                      <span>Visibility</span>
                      <select name="active">
                        <option value="true">Active</option>
                        <option value="false">Hidden</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Reason</span>
                      <input name="reason" minLength={5} required />
                    </label>
                  </div>
                  <button className="button">Update category</button>
                </form>
              ))
            ) : (
              <p>Administrator role required.</p>
            ))}
          {tab === "audit" &&
            data.audit.map((a) => (
              <div className="row-card" key={a.id}>
                <strong>{a.action}</strong>
                <p>
                  {a.targetId} · {date(a.createdAt)}
                </p>
                <p>{a.reason}</p>
              </div>
            ))}
          {tab === "jobs" &&
            data.jobs.map((j) => (
              <div className="row-card" key={j.id}>
                <strong>
                  {j.kind} · {j.processedAt ? "processed" : "pending / retry"}
                </strong>
                <p>
                  {j.attempts} attempt(s) · {j.lastError || "No recorded error"}
                </p>
              </div>
            ))}
        </>
      )}
    </>
  );
}
