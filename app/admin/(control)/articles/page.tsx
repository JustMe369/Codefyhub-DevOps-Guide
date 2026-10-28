import Link from "next/link";
import { headers } from "next/headers";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminArticlesPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const articles = await prisma.article.findMany({
    where: { companyId: actor.companyId },
    include: { section: { select: { title: true, slug: true } }, _count: { select: { versions: true, articleSources: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><div className="eyebrow">Content lifecycle</div><h1>Articles</h1><p>{articles.length} records across draft, published, and archived states.</p></div></header>
      <section className="admin-panel admin-table-wrap">
        <table className="admin-table"><thead><tr><th>Article</th><th>Status</th><th>Validation</th><th>Evidence</th><th>Updated</th></tr></thead><tbody>
          {articles.map((article) => <tr key={article.id}><td><Link href={`/admin/articles/${article.id}`}>{article.title}</Link><span>{article.section.slug}/{article.slug}</span></td><td><span className={`admin-status ${article.status.toLowerCase()}`}>{article.status}</span></td><td>{article.validationStatus.replaceAll("_", " ")}</td><td>{article._count.versions} revisions · {article._count.articleSources} sources</td><td><time dateTime={article.updatedAt.toISOString()}>{article.updatedAt.toLocaleDateString("en", { dateStyle: "medium" })}</time></td></tr>)}
        </tbody></table>
      </section>
    </main>
  );
}
