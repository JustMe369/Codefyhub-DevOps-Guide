import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Filter, LibraryBig, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canAccessRestrictedKnowledge } from "@/lib/admin/authz";
import { searchCompanyKnowledge } from "@/lib/search";
import { contentTypeLabel, getPortalIdentity, isPortalContentType, portalArticleWhere, portalContentTypes } from "@/lib/portal/knowledge";

export default async function PortalKnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const identity = await getPortalIdentity(await headers());
  if (!identity) redirect("/portal/sign-in");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const selectedType = isPortalContentType(params.type) ? params.type : undefined;
  const baseWhere = portalArticleWhere(identity);
  const articles = q.length >= 2 ? [] : await prisma.article.findMany({
    where: { ...baseWhere, ...(selectedType ? { contentType: selectedType } : {}) },
    include: { section: { select: { title: true } }, articleTags: { include: { tag: true } } },
    orderBy: [{ section: { order: "asc" } }, { order: "asc" }],
    take: 100,
  });
  const searchResults = q.length >= 2
    ? (await searchCompanyKnowledge(q, identity.companyId, canAccessRestrictedKnowledge(identity), 50)).filter((result) => !selectedType || result.contentType === selectedType)
    : [];
  const count = q.length >= 2 ? searchResults.length : articles.length;

  return <main className="portal-page">
    <header className="portal-page-header"><div><div className="eyebrow">{identity.companyName}</div><h1>{selectedType ? contentTypeLabel(selectedType) : "Company knowledge"}</h1><p>Search and browse only the approved information available to your company role.</p></div></header>
    <section className="portal-filter-panel"><form action="/portal/knowledge"><label className="portal-search-field"><Search size={18} /><span className="sr-only">Search company knowledge</span><input name="q" type="search" defaultValue={q} minLength={2} maxLength={100} placeholder="Search workflows, questions, solutions, policies…" /></label><label className="portal-type-field"><Filter size={16} /><span className="sr-only">Content type</span><select name="type" defaultValue={selectedType ?? ""}><option value="">All knowledge types</option>{portalContentTypes.map((type) => <option value={type} key={type}>{contentTypeLabel(type)}</option>)}</select></label><button className="portal-primary-button">Search</button></form><p>{count} result{count === 1 ? "" : "s"}{q ? <> for <strong>“{q}”</strong></> : null}</p></section>
    {q.length >= 2 ? <div className="portal-document-list">{searchResults.map((result) => result.kind === "article" ? <Link href={`/portal/knowledge/${result.id}`} key={`${result.kind}-${result.id}`}><div><span>{result.sectionTitle} · {contentTypeLabel(result.contentType)}</span><h2>{result.title}</h2><p>{result.snippet || result.description}</p></div><ArrowRight size={18} /></Link> : <article key={`${result.kind}-${result.id}`}><div><span>Company glossary</span><h2>{result.title}</h2><p>{result.snippet || result.description}</p></div></article>)}</div> : <div className="portal-document-list">{articles.map((article) => <Link href={`/portal/knowledge/${article.id}`} key={article.id}><div><span>{article.section.title} · {contentTypeLabel(article.contentType)}</span><h2>{article.title}</h2><p>{article.description}</p><small>{article.readingMinutes} min · {article.articleTags.map(({ tag }) => tag.name).slice(0, 3).join(" · ")}</small></div><ArrowRight size={18} /></Link>)}</div>}
    {count === 0 && <div className="portal-empty"><LibraryBig size={28} /><h2>No matching company knowledge</h2><p>Try a broader phrase or ask your company knowledge administrator to add the missing answer.</p></div>}
  </main>;
}
