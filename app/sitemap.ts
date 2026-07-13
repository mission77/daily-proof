import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  });
  return [
    page("", 1),
    page("/pricing", 0.9),
    page("/support", 0.6),
    page("/privacy", 0.4),
    page("/terms", 0.4),
    page("/refunds", 0.4),
    page("/contact", 0.4),
  ];
}
