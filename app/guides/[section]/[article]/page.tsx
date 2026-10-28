import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Gauge } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { MarkdownArticle, headingId } from "@/components/markdown-article";
import { ArticleProgress } from "@/components/article-progress";
import { RaidPicker } from "@/components/raid-picker";
import { VpnPicker } from "@/components/vpn-picker";
import { RemoteAccessPicker } from "@/components/remote-access-picker";
import { ContentMetadata, RelatedGuides } from "@/components/docs/content-metadata";

type Props = { params: Promise<{ section: string; article: string }> };

async function findPublishedArticle(sectionSlug: string, articleSlug: string) {
  return prisma.article.findFirst({
    where: { slug: articleSlug, section: { slug: sectionSlug, status: "PUBLISHED" }, status: "PUBLISHED", visibility: "PUBLIC", company: { isPublic: true, status: "ACTIVE" } },
    include: { section: true, articleSources: { include: { source: true } }, articleTags: { include: { tag: true } } }
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section, article } = await params;
  const row = await findPublishedArticle(section, article);
  if (!row) return {};
  const url = `/guides/${row.section.slug}/${row.slug}`;
  return { title: row.title, description: row.description, alternates: { canonical: url }, openGraph: { title: row.title, description: row.description, url, type: "article", publishedTime: row.publishedAt?.toISOString(), modifiedTime: row.updatedAt.toISOString() } };
}

function headings(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => ({ label: match[1], id: headingId(match[1]) }));
}

export default async function ArticlePage({ params }: Props) {
  const { section: sectionSlug, article: articleSlug } = await params;
  const article = await findPublishedArticle(sectionSlug, articleSlug);
  if (!article) notFound();
  const toc = headings(article.body);
  const siblings = await prisma.article.findMany({ where: { sectionId: article.sectionId, status: "PUBLISHED", visibility: "PUBLIC" }, orderBy: { order: "asc" }, select: { slug: true, title: true, order: true } });
  const index = siblings.findIndex((item) => item.slug === article.slug);
  const previous = siblings[index - 1];
  const next = siblings[index + 1];
  const relatedRows = article.relatedGuides.length ? await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      companyId: article.companyId,
      OR: article.relatedGuides.map((key) => {
        const [section, slug] = key.split("/");
        return { slug, section: { slug: section, status: "PUBLISHED" as const } };
      })
    },
    include: { section: true }
  }) : [];
  const relatedByKey = new Map(relatedRows.map((row) => [`${row.section.slug}/${row.slug}`, row]));
  const relatedGuides = article.relatedGuides.flatMap((key) => {
    const row = relatedByKey.get(key);
    return row ? [{ href: `/guides/${row.section.slug}/${row.slug}`, title: row.title, description: row.description }] : [];
  });
  const repositoryUrl = (process.env.NEXT_PUBLIC_REPOSITORY_URL ?? "https://github.com/JustMe369/Codefyhub-DevOps-Guide").replace(/\/$/, "");
  const sourceEditUrl = article.section.slug === "storage-raid" && ["mdadm-zfs", "degraded-mdadm-recovery"].includes(article.slug)
    ? `${repositoryUrl}/edit/main/site_content/storage-raid/${article.slug}.md`
    : null;
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
            {article.status === "PUBLISHED" && article.lastVerifiedAt && (
              <span><CalendarCheck size={14} />Verified {formatDate(article.lastVerifiedAt)}</span>
            )}
          </div>
          {article.status === "PUBLISHED" && article.lastVerifiedAt && (
            <p className="verification-note">Reviewed by {article.verifiedBy} · {article.verificationMethod} · Compatibility: {article.testedVersions}</p>
          )}
          {sourceEditUrl && <p className="source-edit"><a href={sourceEditUrl} target="_blank" rel="noopener noreferrer">View source or propose an edit</a></p>}
          <ContentMetadata
            contentType={article.contentType}
            validationStatus={article.validationStatus}
            platforms={article.applicablePlatforms}
            versions={article.applicableVersions}
            prerequisites={article.prerequisites}
            tags={article.articleTags.map(({ tag }) => tag.name)}
            relatedGuides={[]}
            testedAt={article.testedAt}
            testEnvironment={article.testEnvironment}
          />
          <div style={{ marginTop: 22 }}><ArticleProgress articleId={article.id} /></div>
        </header>
        <MarkdownArticle body={article.body} />
        {article.slug === "mdadm-zfs" && (
          <section className="artifact-card">
            <div><div className="eyebrow">Reusable configuration</div><h2>mdadm monitoring recipe</h2><p>Download the reviewed starting point, replace its placeholders, add the host-specific array identity, and validate alert delivery before relying on it.</p></div>
            <Link className="button button-primary" href="/configurations/mdadm-monitoring">Review artifact</Link>
          </section>
        )}
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
          <ul>{article.articleSources.map(({ source, claimScope }) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.organization}: {source.title}</a>{claimScope ? <span> — {claimScope}</span> : null}</li>)}</ul>
        </section>
        <RelatedGuides guides={relatedGuides} />
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
