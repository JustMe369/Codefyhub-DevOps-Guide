import Link from "next/link";
import { headers } from "next/headers";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminOverviewPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const [statusGroups, sectionCount, sourceCount, recentAudit] = await Promise.all([
    prisma.article.groupBy({ by: ["status"], where: { companyId: actor.companyId }, _count: { _all: true } }),
    prisma.section.count({ where: { companyId: actor.companyId } }),
    prisma.source.count({ where: { companyId: actor.companyId } }),
    prisma.auditEvent.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const count = (status: string) => statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} workspace</div><h1>Knowledge control plane</h1><p>Editorial state, provenance, and recent administrative activity.</p></div><Link href="/admin/articles" className="admin-primary-button">Manage articles</Link></header>
      <section className="admin-metric-grid" aria-label="Content metrics">
        <article><span>Published</span><strong>{count("PUBLISHED")}</strong></article>
        <article><span>Drafts</span><strong>{count("DRAFT")}</strong></article>
        <article><span>Archived</span><strong>{count("ARCHIVED")}</strong></article>
        <article><span>Sections</span><strong>{sectionCount}</strong></article>
        <article><span>Sources</span><strong>{sourceCount}</strong></article>
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
