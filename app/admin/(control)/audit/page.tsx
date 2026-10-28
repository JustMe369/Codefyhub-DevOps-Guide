import { headers } from "next/headers";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AuditPage() {
  const actor = await requireAdminIdentity(await headers(), "audit.view");
  const events = await prisma.auditEvent.findMany({ where: { companyId: actor.companyId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 250 });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Governance evidence</div><h1>Audit trail</h1><p>The latest accountable changes inside {actor.companyName}.</p></div></header><section className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>Event</th><th>Actor</th><th>Entity</th><th>Time</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td><strong>{event.summary}</strong><span>{event.action}</span></td><td>{event.actorEmail}</td><td>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ""}</td><td><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></td></tr>)}</tbody></table>{events.length === 0 && <p className="admin-empty">No company changes have been recorded.</p>}</section></main>;
}
