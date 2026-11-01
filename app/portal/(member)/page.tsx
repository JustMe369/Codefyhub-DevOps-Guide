import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, CircleHelp, LibraryBig, ShieldCheck, Wrench, Workflow } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { contentTypeLabel, getPortalIdentity, portalArticleWhere } from "@/lib/portal/knowledge";

const categoryCards = [
  { type: "WORKFLOW", label: "Workflows", description: "Approved operating workflows and procedures for your teams.", icon: Workflow },
  { type: "FAQ", label: "Questions & answers", description: "Trusted answers to the questions your teams ask repeatedly.", icon: CircleHelp },
  { type: "ISSUE_SOLUTION", label: "Issue solutions", description: "Proven fixes and lessons from previously resolved incidents.", icon: Wrench },
  { type: "POLICY", label: "Policies", description: "Approved standards, responsibilities, and guardrails.", icon: ShieldCheck },
] as const;

export default async function PortalHomePage() {
  const identity = await getPortalIdentity(await headers());
  if (!identity) redirect("/portal/sign-in");
  const where = portalArticleWhere(identity);
  const [groups, recent, total] = await Promise.all([
    prisma.article.groupBy({ by: ["contentType"], where, _count: { _all: true } }),
    prisma.article.findMany({ where, orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }], take: 6, include: { section: { select: { title: true } } } }),
    prisma.article.count({ where }),
  ]);
  const countFor = (type: string) => groups.find((group) => group.contentType === type)?._count._all ?? 0;

  const activeCategories = categoryCards.filter(({ type }) => countFor(type) > 0).length;
  return <main className="portal-page">
    <header className="portal-hero"><div className="portal-hero-copy"><div className="portal-hero-kicker"><span className="portal-live-dot" /> {identity.companyName} private knowledge</div><h1>Your company’s answers, ready when work happens.</h1><p>Find approved workflows, trusted answers, and proven fixes in one focused workspace—without crossing company boundaries.</p><div className="portal-hero-actions"><Link href="/portal/knowledge" className="portal-primary-button"><LibraryBig size={18} /> Explore all knowledge</Link><Link href="/portal/knowledge?type=WORKFLOW" className="portal-secondary-button"><Workflow size={18} /> Browse workflows</Link></div><div className="portal-hero-metrics" aria-label="Knowledge workspace summary"><span><strong>{total}</strong><small>published documents</small></span><span><strong>{activeCategories}</strong><small>active categories</small></span><span><strong>100%</strong><small>company isolated</small></span></div></div><div className="portal-trust-card"><span className="portal-trust-logo-wrap">{identity.hasCompanyLogo ? <Image className="portal-trust-logo" src={`/api/portal/company-logo?companyId=${encodeURIComponent(identity.companyId)}`} alt={`${identity.companyName} logo`} width={96} height={96} unoptimized /> : <ShieldCheck size={38} aria-hidden="true" />}</span><span className="portal-trust-label">Verified workspace</span><strong>Knowledge you can trust</strong><span>Signed in as {identity.roleName}</span><small>Approved and current documents only</small><Link href="/portal/knowledge">Open the library <ArrowRight size={14} /></Link></div></header>
    <section className="portal-category-grid" aria-label="Knowledge categories">{categoryCards.map(({ type, label, description, icon: Icon }) => <Link href={`/portal/knowledge?type=${type}`} key={type}><div className="portal-category-card-top"><span><Icon size={20} /></span><small>{countFor(type)} {countFor(type) === 1 ? "document" : "documents"}</small></div><strong>{label}</strong><p>{description}</p><small className="portal-category-link">Explore category <ArrowRight size={14} /></small></Link>)}</section>
    <section className="portal-section"><div className="portal-section-heading"><div><div className="eyebrow">Recently maintained</div><h2>Latest company knowledge</h2></div><Link href="/portal/knowledge">View everything <ArrowRight size={15} /></Link></div><div className="portal-document-grid">{recent.map((article) => <Link href={`/portal/knowledge/${article.id}`} key={article.id} className="portal-document-card"><span>{article.section.title} · {contentTypeLabel(article.contentType)}</span><h3>{article.title}</h3><p>{article.description}</p><small>{article.readingMinutes} min read <ArrowRight size={14} /></small></Link>)}</div>{recent.length === 0 && <div className="portal-empty"><LibraryBig size={28} /><h3>No approved knowledge yet</h3><p>Your company administrator can publish reviewed FAQs, policies, and solutions from the Studio.</p></div>}</section>
  </main>;
}
