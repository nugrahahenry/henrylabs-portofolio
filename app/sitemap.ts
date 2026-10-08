import type { MetadataRoute } from "next";
import { projectCatalog } from "@/content/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/projects", "/credentials", ...projectCatalog.map(project => `/projects/${project.slug}`)].map(path => ({
    url: new URL(path, siteUrl).toString(), changeFrequency: "monthly", priority: path === "/" ? 1 : .8,
  }));
}
