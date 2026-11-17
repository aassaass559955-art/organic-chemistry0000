import type { MetadataRoute } from "next";
import { listArticles, listTopics } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = [
    "",
    "/researches",
    "/studies",
    "/theses",
    "/articles",
    "/topics",
    "/reactions",
    "/structures",
    "/library",
    "/news",
    "/about",
    "/researcher",
    "/contact",
    "/assistant",
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  /**
   * Database lookups are wrapped so the sitemap still builds (and deploys on
   * Vercel/Netlify) even when DATABASE_URL is unavailable at build time or the
   * database is unreachable — in that case we ship the static entries only.
   */
  try {
    const [articles, topicList] = await Promise.all([listArticles({}), listTopics()]);
    return [
      ...staticEntries,
      ...articles.map((a) => ({
        url: `${base}/articles/${a.slug}`,
        lastModified: new Date(a.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
      ...topicList.map((tp) => ({
        url: `${base}/topics/${tp.slug}`,
        lastModified: new Date(tp.createdAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
