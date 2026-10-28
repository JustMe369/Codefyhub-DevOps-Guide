import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "@/components/admin/article-editor";
import { RevisionHistory } from "@/components/admin/revision-history";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const [article, sections, sources, tags] = await Promise.all([
    prisma.article.findFirst({ where: { id, companyId: actor.companyId }, include: { articleSources: true, articleTags: true, versions: { orderBy: { revision: "desc" }, take: 30, include: { createdBy: { select: { name: true, email: true } } } } } }),
    prisma.section.findMany({ where: { companyId: actor.companyId }, orderBy: { order: "asc" }, select: { id: true, title: true } }),
    prisma.source.findMany({ where: { companyId: actor.companyId }, orderBy: [{ organization: "asc" }, { title: "asc" }], select: { id: true, title: true, organization: true } }),
    prisma.tag.findMany({ where: { companyId: actor.companyId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!article) notFound();
  const serialized = {
    ...article,
    lastVerifiedAt: article.lastVerifiedAt.toISOString(),
    testedAt: article.testedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    publishedAt: article.publishedAt?.toISOString() ?? null,
  };
  return (
    <main className="admin-page admin-editor-page">
      <header className="admin-page-header"><div><Link href="/admin/articles" className="admin-back"><ArrowLeft size={15} /> Articles</Link><h1>{article.title}</h1><p>Edit metadata and Markdown with revision history and publication guardrails.</p></div></header>
      <ArticleEditor initialArticle={serialized} sections={sections} sources={sources} tags={tags} initialSourceIds={article.articleSources.map((item) => item.sourceId)} initialTagIds={article.articleTags.map((item) => item.tagId)} />
      <RevisionHistory articleId={article.id} expectedUpdatedAt={serialized.updatedAt} currentBody={article.body} revisions={article.versions.map((version) => ({ ...version, createdAt: version.createdAt.toISOString() }))} />
    </main>
  );
}
