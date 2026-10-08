import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  if (process.env.DEMO_MODE === "true")
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth",
        "/dashboard",
        "/messages",
        "/orders",
        "/admin",
        "/sell",
        "/compare",
      ],
    },
    sitemap: `${process.env.BETTER_AUTH_URL}/sitemap.xml`,
  };
}
