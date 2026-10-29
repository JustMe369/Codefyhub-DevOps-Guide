import Link from "next/link";
import { headers } from "next/headers";
import { FilePlus2, FolderTree, Settings2, Users } from "lucide-react";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const expiresSoon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [statusGroups, sectionCount, sourceCount, reviewQueue, staleCount, expiringCount, recentAudit] = await Promise.all([
    prisma.article.groupBy({ by: ["status"], where: { companyId: actor.companyId }, _count: { _all: true } }),
    prisma.section.count({ where: { companyId: actor.companyId } }),
    prisma.source.count({ where: { companyId: actor.companyId } }),
    prisma.article.count({ where: { companyId: actor.companyId, reviewStatus: "IN_REVIEW" } }),
    prisma.article.count({ where: { companyId: actor.companyId, status: "PUBLISHED", lastVerifiedAt: { lt: staleBefore } } }),
    prisma.article.count({ where: { companyId: actor.companyId, status: "PUBLISHED", expiresAt: { gt: now, lte: expiresSoon } } }),
    prisma.auditEvent.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const count = (status: string) => statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} workspace</div><h1>Knowledge control plane</h1><p>Editorial state, provenance, and recent administrative activity.</p></div><div className="admin-header-actions">{actor.permissions.includes("content.create") && <Link href="/admin/articles/new?type=FAQ" className="admin-primary-button"><FilePlus2 size={17} /> New FAQ</Link>}<Link href="/admin/articles" className="admin-secondary-button">Manage articles</Link></div></header>
      <section className="admin-metric-grid" aria-label="Content metrics">
        <article><span>Published</span><strong>{count("PUBLISHED")}</strong></article>
        <article><span>Drafts</span><strong>{count("DRAFT")}</strong></article>
        <article><span>Archived</span><strong>{count("ARCHIVED")}</strong></article>
        <article><span>Sections</span><strong>{sectionCount}</strong></article>
        <article><span>Sources</span><strong>{sourceCount}</strong></article>
        <article><span>Awaiting review</span><strong>{reviewQueue}</strong></article>
        <article><span>Stale knowledge</span><strong>{staleCount}</strong></article>
        <article><span>Expiring in 30 days</span><strong>{expiringCount}</strong></article>
      </section>
      <section className="admin-control-grid" aria-label="Administration shortcuts">
        {actor.permissions.includes("content.create") && <Link href="/admin/articles/new"><FilePlus2 size={20} /><span><strong>Create knowledge</strong><small>FAQ, issue solution, or policy</small></span></Link>}
        {actor.permissions.includes("structure.manage") && <Link href="/admin/taxonomy"><FolderTree size={20} /><span><strong>Manage structure</strong><small>Sections, navigation, and tags</small></span></Link>}
        {actor.permissions.includes("members.view") && <Link href="/admin/members"><Users size={20} /><span><strong>Manage access</strong><small>Members, invitations, and company roles</small></span></Link>}
        {actor.isPlatformAdmin && <Link href="/admin/users"><Settings2 size={20} /><span><strong>Platform controls</strong><small>Administrator email, users, and suspension</small></span></Link>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Recent audit events</h2><p>Immutable accountability for control-plane writes.</p></div></div>
        {recentAudit.length === 0 ? <p className="admin-empty">No control-plane changes have been recorded yet.</p> : (
          <div className="admin-audit-list">{recentAudit.map((event) => <article key={event.id}><div><strong>{event.summary}</strong><span>{event.actorEmail} · {event.action}</span></div><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></article>)}</div>
        )}
      </section>
    </main>
  );
}
