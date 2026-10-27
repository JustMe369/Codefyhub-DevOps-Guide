import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sections = await prisma.section.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } });
  const articles = await prisma.article.findMany({ where: { status: "PUBLISHED", section: { status: "PUBLISHED" } }, include: { section: true } });
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return [
    { url: base },
    { url: `${base}/glossary` },
    { url: `${base}/exam` },
    { url: `${base}/checklist` },
    { url: `${base}/configurations` },
    { url: `${base}/configurations/mdadm-monitoring` },
    ...sections.map((section) => ({ url: `${base}/guides/${section.slug}`, lastModified: section.updatedAt })),
    ...articles.map((a) => ({ url: `${base}/guides/${a.section.slug}/${a.slug}`, lastModified: a.updatedAt }))
  ];
}
