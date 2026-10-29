import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck, Clock3, ExternalLink, ShieldCheck } from "lucide-react";
import { MarkdownArticle } from "@/components/markdown-article";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { contentTypeLabel, getPortalIdentity, portalArticleWhere } from "@/lib/portal/knowledge";

export default async function PortalArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getPortalIdentity(await headers());
  if (!identity) redirect("/portal/sign-in");
  const { id } = await params;
  const article = await prisma.article.findFirst({
    where: { ...portalArticleWhere(identity), id },
    include: { section: true, articleSources: { include: { source: true } }, articleTags: { include: { tag: true } } },
  });
  if (!article) notFound();

  return <main className="portal-page portal-article-page">
    <Link href="/portal/knowledge" className="portal-back"><ArrowLeft size={16} /> Back to company knowledge</Link>
    <article className="portal-article">
      <header><div className="eyebrow">{article.section.title} · {contentTypeLabel(article.contentType)}</div><h1>{article.title}</h1><p>{article.description}</p><div className="portal-article-meta"><span><Clock3 size={15} /> {article.readingMinutes} min read</span><span><CalendarCheck size={15} /> Verified {formatDate(article.lastVerifiedAt)}</span><span><ShieldCheck size={15} /> Approved company knowledge</span></div>{article.articleTags.length > 0 && <div className="portal-tags">{article.articleTags.map(({ tag }) => <span key={tag.id}>{tag.name}</span>)}</div>}</header>
      <MarkdownArticle body={article.body} />
      {article.articleSources.length > 0 && <section className="portal-sources"><h2>Verified sources</h2><ul>{article.articleSources.map(({ source, claimScope }) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.organization}: {source.title} <ExternalLink size={13} /></a>{claimScope && <span>{claimScope}</span>}</li>)}</ul></section>}
      <footer><span>Verified by {article.verifiedBy}</span><span>{article.verificationMethod}</span></footer>
    </article>
  </main>;
}
