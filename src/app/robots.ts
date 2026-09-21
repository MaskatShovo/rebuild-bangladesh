import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
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
