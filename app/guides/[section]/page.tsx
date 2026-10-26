import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: slug } = await params;
  const section = await prisma.section.findFirst({ where: { slug, status: "PUBLISHED" }, select: { title: true, summary: true, slug: true } });
  if (!section) return {};
  const url = `/guides/${section.slug}`;
  return { title: section.title, description: section.summary, alternates: { canonical: url }, openGraph: { title: section.title, description: section.summary, url } };
}

export default async function SectionPage({ params }: Props) {
  const { section: slug } = await params;
  const section = await prisma.section.findFirst({
    where: { slug, status: "PUBLISHED" },
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
