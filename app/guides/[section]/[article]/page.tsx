import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock3, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { MarkdownArticle, headingId } from "@/components/markdown-article";
import { ArticleProgress } from "@/components/article-progress";

function headings(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => ({ label: match[1], id: headingId(match[1]) }));
}

export default async function ArticlePage({ params }: { params: Promise<{ section: string; article: string }> }) {
  const { section: sectionSlug, article: articleSlug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug: articleSlug, section: { slug: sectionSlug }, status: "PUBLISHED" },
    include: { section: true, articleSources: { include: { source: true } } }
  });
  if (!article) notFound();
  const toc = headings(article.body);
  return (
    <>
      <article className="article">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={`/guides/${article.section.slug}`}>{article.section.title}</Link><span>/</span><span>{article.title}</span></nav>
        <header className="article-header">
          <div className="eyebrow">{article.section.title}</div>
          <h1>{article.title}</h1>
          <p className="article-description">{article.description}</p>
          <div className="article-meta">
            <span><Clock3 size={14} />{article.readingMinutes} min read</span>
            <span><Gauge size={14} />{article.difficulty.toLowerCase()}</span>
            <span><CalendarCheck size={14} />Verified {formatDate(article.lastVerifiedAt)}</span>
          </div>
          <div style={{ marginTop: 22 }}><ArticleProgress articleId={article.id} /></div>
        </header>
        <MarkdownArticle body={article.body} />
        <section className="sources">
          <h2>Official references</h2>
          <ul>{article.articleSources.map(({ source }) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.organization}: {source.title}</a></li>)}</ul>
        </section>
      </article>
      <aside className="toc" aria-label="On this page">
        <div className="toc-title">On this page</div>
        {toc.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </aside>
    </>
  );
}
