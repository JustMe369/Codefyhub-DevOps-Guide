import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await prisma.article.findMany({ where: { status: "PUBLISHED" }, include: { section: true } });
  const base = "http://localhost:3000";
  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/glossary`, lastModified: new Date() },
    { url: `${base}/checklist`, lastModified: new Date() },
    ...articles.map((a) => ({ url: `${base}/guides/${a.section.slug}/${a.slug}`, lastModified: a.updatedAt }))
  ];
}
