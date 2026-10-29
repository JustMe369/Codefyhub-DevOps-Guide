import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  
  try {
    const sections = await prisma.section.findMany({ 
      where: { status: "PUBLISHED", company: { isPublic: true, status: "ACTIVE" } }, 
      select: { slug: true, updatedAt: true } 
    });
    const articles = await prisma.article.findMany({ 
      where: { status: "PUBLISHED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" }, company: { isPublic: true, status: "ACTIVE" }, section: { status: "PUBLISHED" } },
      include: { section: true } 
    });
    
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
  } catch {
    // Fallback for build time when DB is not available
    return [
      { url: base },
      { url: `${base}/glossary` },
      { url: `${base}/exam` },
      { url: `${base}/checklist` },
      { url: `${base}/configurations` },
      { url: `${base}/configurations/mdadm-monitoring` },
    ];
  }
}
