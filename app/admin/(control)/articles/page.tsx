import Link from "next/link";
import { headers } from "next/headers";
import { FilePlus2 } from "lucide-react";
import { articleAccessWhere, requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminArticlesPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const articles = await prisma.article.findMany({
    where: articleAccessWhere(actor),
    include: { section: { select: { title: true, slug: true } }, _count: { select: { versions: true, articleSources: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><div className="eyebrow">Content lifecycle</div><h1>Articles</h1><p>{articles.length} records across draft, published, and archived states.</p></div>{actor.permissions.includes("content.create") && <div className="admin-header-actions"><Link href="/admin/articles/new?type=FAQ" className="admin-primary-button"><FilePlus2 size={17} /> New FAQ</Link><Link href="/admin/articles/new" className="admin-secondary-button">Other knowledge</Link></div>}</header>
      <section className="admin-panel admin-table-wrap">
        <table className="admin-table"><thead><tr><th>Article</th><th>Status</th><th>Validation</th><th>Evidence</th><th>Updated</th></tr></thead><tbody>
          {articles.map((article) => <tr key={article.id}><td><Link href={`/admin/articles/${article.id}`}>{article.title}</Link><span>{article.section.slug}/{article.slug}</span></td><td><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status}</span></td><td>{article.validationStatus.replaceAll("_", " ")}</td><td>{article._count.versions} revisions · {article._count.articleSources} sources</td><td><time dateTime={article.updatedAt.toISOString()}>{article.updatedAt.toLocaleDateString("en", { dateStyle: "medium" })}</time></td></tr>)}
        </tbody></table>
      </section>
    </main>
  );
}
