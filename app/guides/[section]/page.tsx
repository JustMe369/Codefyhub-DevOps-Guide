import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: slug } = await params;
  const section = await prisma.section.findFirst({ where: { slug, status: "PUBLISHED", company: { isPublic: true, status: "ACTIVE" } }, select: { title: true, summary: true, slug: true } });
  if (!section) return {};
  const url = `/guides/${section.slug}`;
  return { title: section.title, description: section.summary, alternates: { canonical: url }, openGraph: { title: section.title, description: section.summary, url } };
}

export default async function SectionPage({ params }: Props) {
  const { section: slug } = await params;
  const section = await prisma.section.findFirst({
    where: { slug, status: "PUBLISHED", company: { isPublic: true, status: "ACTIVE" } },
    include: { articles: { where: { status: "PUBLISHED", visibility: "PUBLIC" }, orderBy: { order: "asc" } } }
  });
  if (!section) notFound();
  const isStorageSlice = section.slug === "storage-raid";
  const articleCard = (article: typeof section.articles[number]) => (
    <Link className="article-row" href={`/guides/${section.slug}/${article.slug}`} key={article.id}>
      <span className="article-row-num">{String(article.order).padStart(2, "0")}</span>
      <span><span className="article-type">{article.contentType.toLowerCase().replaceAll("_", " ")} · {article.validationStatus.toLowerCase().replaceAll("_", " ")}</span><h2>{article.title}</h2><p>{article.description}</p></span>
      <span className="article-row-meta">{article.readingMinutes} min<br />{article.difficulty.toLowerCase()}</span>
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  );
  return (
    <div style={{ gridColumn: "2 / -1" }}>
      <div className="page-hero">
        <div className="eyebrow">Section {String(section.order).padStart(2, "0")}</div>
        <h1>{section.title}</h1>
        <p>{section.summary}</p>
      </div>
      {isStorageSlice ? (
        <div className="category-groups">
          <section><div className="category-group-heading"><span>01</span><div><h2>Learn and decide</h2><p>Understand failure tolerance, capacity, and workload tradeoffs before creating an array.</p></div></div><div className="article-list">{section.articles.filter((article) => ["CONCEPT", "REFERENCE"].includes(article.contentType)).map(articleCard)}</div></section>
          <section><div className="category-group-heading"><span>02</span><div><h2>Build and configure</h2><p>Apply a reviewed implementation and keep the exact artifact under change control.</p></div></div><div className="article-list">{section.articles.filter((article) => ["HOW_TO", "CONFIGURATION_RECIPE"].includes(article.contentType)).map(articleCard)}<Link className="artifact-index-row" href="/configurations/mdadm-monitoring"><span>Configuration artifact</span><strong>mdadm monitoring recipe</strong><ArrowRight size={17} /></Link></div></section>
          <section><div className="category-group-heading"><span>03</span><div><h2>Respond and recover</h2><p>Start with read-only evidence, protect the surviving copy, and verify recoverability.</p></div></div><div className="article-list">{section.articles.filter((article) => article.contentType === "RUNBOOK").map(articleCard)}</div></section>
        </div>
      ) : <div className="article-list">{section.articles.map(articleCard)}</div>}
    </div>
  );
}
