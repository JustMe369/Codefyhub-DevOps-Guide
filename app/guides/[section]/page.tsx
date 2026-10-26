import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params;
  const section = await prisma.section.findUnique({
    where: { slug },
    include: { articles: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } } }
  });
  if (!section) notFound();
  return (
    <div style={{ gridColumn: "2 / -1" }}>
      <div className="page-hero">
        <div className="eyebrow">Section {String(section.order).padStart(2, "0")}</div>
        <h1>{section.title}</h1>
        <p>{section.summary}</p>
      </div>
      <div className="article-list">
        {section.articles.map((article) => (
          <Link className="article-row" href={`/guides/${section.slug}/${article.slug}`} key={article.id}>
            <span className="article-row-num">{String(article.order).padStart(2, "0")}</span>
            <span><h2>{article.title}</h2><p>{article.description}</p></span>
            <span className="article-row-meta">{article.readingMinutes} min<br />{article.difficulty.toLowerCase()}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
