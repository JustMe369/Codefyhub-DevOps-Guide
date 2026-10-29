import Link from "next/link";
import { headers } from "next/headers";
import { canAccessRestrictedKnowledge, requireAdminIdentity } from "@/lib/admin/authz";
import { searchCompanyKnowledge } from "@/lib/search";
import { KnowledgeGapCapture } from "@/components/admin/knowledge-gap-capture";

export default async function AdminKnowledgeSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const results = q.length >= 2 ? await searchCompanyKnowledge(q, actor.companyId, canAccessRestrictedKnowledge(actor)) : [];
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} knowledge retrieval</div><h1>Search the company bank</h1><p>Permission-aware search across approved company articles and glossary terms.</p></div></header><section className="admin-panel admin-manager-form"><form action="/admin/search"><label>Search company knowledge<input name="q" type="search" defaultValue={q} minLength={2} maxLength={100} autoFocus /></label><button className="admin-primary-button">Search</button></form></section>{q && <section className="admin-panel"><div className="admin-panel-heading"><h2>{results.length} result{results.length === 1 ? "" : "s"}</h2></div><div className="admin-audit-list">{results.map((result) => <article key={`${result.kind}-${result.id}`}><div><strong>{result.kind === "article" ? <Link href={`/admin/articles/${result.id}`}>{result.title}</Link> : result.title}</strong><span>{result.sectionTitle} · {result.contentType.toLowerCase().replaceAll("_", " ")}</span><p>{result.snippet}</p></div></article>)}</div>{results.length === 0 && <KnowledgeGapCapture query={q} />}</section>}</main>;
}
