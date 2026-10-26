import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { MarkdownArticle, headingId } from "@/components/markdown-article";
import { ArticleProgress } from "@/components/article-progress";
import { RaidPicker } from "@/components/raid-picker";
import { VpnPicker } from "@/components/vpn-picker";
import { RemoteAccessPicker } from "@/components/remote-access-picker";

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
  const siblings = await prisma.article.findMany({ where: { sectionId: article.sectionId, status: "PUBLISHED" }, orderBy: { order: "asc" }, select: { slug: true, title: true, order: true } });
  const index = siblings.findIndex((item) => item.slug === article.slug);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
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
        {article.slug === "choose-raid" && (
          <section className="decision-tools">
            <h2>Decision Tools</h2>
            <RaidPicker />
          </section>
        )}
        {article.slug === "connect-everywhere" && (
          <section className="decision-tools">
            <h2>Decision Tools</h2>
            <p className="decision-tool-intro">Use these interactive tools to choose the right tool for your situation:</p>
            <VpnPicker />
            <RemoteAccessPicker />
          </section>
        )}
        {article.slug === "beginner-remote-access" && (
          <section className="decision-tools">
            <h2>Decision Tools</h2>
            <p className="decision-tool-intro">Need help choosing a remote access tool? Answer a few questions:</p>
            <RemoteAccessPicker />
          </section>
        )}
        {article.slug === "wireguard" && (
          <section className="decision-tools">
            <h2>Decision Tools</h2>
            <p className="decision-tool-intro">Choose the right VPN protocol for your network:</p>
            <VpnPicker />
          </section>
        )}
        <section className="sources">
          <h2>Official references</h2>
          <ul>{article.articleSources.map(({ source }) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.organization}: {source.title}</a></li>)}</ul>
        </section>
        {(previous || next) && <nav className="lesson-nav" aria-label="Lesson navigation">
          {previous ? <Link href={`/guides/${article.section.slug}/${previous.slug}`}><ArrowLeft size={16} /><span><small>Previous lesson</small>{previous.title}</span></Link> : <span />}
          {next ? <Link href={`/guides/${article.section.slug}/${next.slug}`}><span><small>Next lesson</small>{next.title}</span><ArrowRight size={16} /></Link> : <span />}
        </nav>}
      </article>
      <aside className="toc" aria-label="On this page">
        <div className="toc-title">On this page</div>
        {toc.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </aside>
    </>
  );
}
