import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminTaxonomyPage() {
  const [sections, tags] = await Promise.all([
    prisma.section.findMany({ include: { _count: { select: { articles: true } } }, orderBy: { order: "asc" } }),
    prisma.tag.findMany({ include: { _count: { select: { articleTags: true } } }, orderBy: { name: "asc" } }),
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Knowledge topology</div><h1>Structure</h1><p>Control navigation sections and the tag vocabulary used across the guide.</p></div></header><TaxonomyManager initialSections={sections} initialTags={tags} /></main>;
}
