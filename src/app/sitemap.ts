import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const listings = await db.listing.findMany({
    where: {
      status: "APPROVED",
      seller: { suspended: false },
      category: { active: true },
    },
    select: { id: true, updatedAt: true },
  });
  return [
    { url: base },
    { url: `${base}/browse` },
    { url: `${base}/wanted` },
    { url: `${base}/help` },
    ...listings.map((l) => ({
      url: `${base}/listings/${l.id}`,
      lastModified: l.updatedAt,
    })),
  ];
}
export const dynamic = "force-dynamic";
