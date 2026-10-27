import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleEditor } from "@/components/admin/article-editor";
import { prisma } from "@/lib/prisma";

export default async function AdminArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, sections] = await Promise.all([
    prisma.article.findUnique({ where: { id }, include: { _count: { select: { articleSources: true } } } }),
    prisma.section.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } }),
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
      <ArticleEditor initialArticle={serialized} sections={sections} sourceCount={article._count.articleSources} />
    </main>
  );
}
