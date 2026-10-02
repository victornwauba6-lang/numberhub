import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard/",
        "/wallet/",
        "/orders/",
        "/transactions/",
        "/profile/",
      ],
    },
    sitemap: "https://numberhub.onrender.com/sitemap.xml",
  };
}
