import { headers } from "next/headers";
import { SourceManager } from "@/components/admin/source-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function AdminSourcesPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const sources = await prisma.source.findMany({ where: { companyId: actor.companyId }, include: { _count: { select: { articleSources: true } } }, orderBy: [{ organization: "asc" }, { title: "asc" }] });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Evidence management</div><h1>Sources</h1><p>Manage the authorities that support published technical claims.</p></div></header><SourceManager initialSources={sources.map((source) => ({ ...source, lastVerifiedAt: source.lastVerifiedAt.toISOString() }))} canManage={actor.permissions.includes("sources.manage")} /></main>;
}
