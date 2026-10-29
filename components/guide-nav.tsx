import Link from "next/link";
import { prisma } from "@/lib/prisma";

export async function GuideNav() {
  const sections = await prisma.section.findMany({
    where: {
      status: "PUBLISHED",
      company: { isPublic: true, status: "ACTIVE" },
      articles: { some: { status: "PUBLISHED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" } } },
    },
    orderBy: { order: "asc" },
    include: { articles: { where: { status: "PUBLISHED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" } }, orderBy: { order: "asc" }, select: { slug: true, title: true } } }
  });
  return (
    <>
      <aside className="side-nav desktop-guide-nav" aria-label="Guide navigation">
        <div className="side-title">Field guide</div>
        {sections.map((section) => (
          <div className="side-section" key={section.id}>
            <Link href={`/guides/${section.slug}`}><span>{String(section.order).padStart(2, "0")}</span>{section.title}</Link>
            <div className="side-articles">
              {section.articles.map((article) => <Link href={`/guides/${section.slug}/${article.slug}`} key={article.slug}>{article.title}</Link>)}
            </div>
          </div>
        ))}
      </aside>
      <details className="mobile-guide-nav">
        <summary>Browse all {sections.length} guide sections</summary>
        <div>{sections.map((section) => <Link href={`/guides/${section.slug}`} key={section.id}><span>{String(section.order).padStart(2, "0")}</span>{section.title}</Link>)}</div>
      </details>
    </>
  );
}
