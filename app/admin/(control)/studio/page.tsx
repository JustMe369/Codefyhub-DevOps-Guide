import { headers } from "next/headers";
import { StudioWorkspace } from "@/components/admin/studio-workspace";
import { articleAccessWhere, requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function StudioPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const articleAccess = articleAccessWhere(actor);
  const sections = await prisma.section.findMany({
    where: { companyId: actor.companyId, status: { not: "ARCHIVED" } },
    select: { id: true, title: true, slug: true, articles: { where: { ...articleAccess, status: { not: "ARCHIVED" } }, select: { id: true, title: true, slug: true, status: true, validationStatus: true, reviewStatus: true, updatedAt: true }, orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return <main className="admin-page admin-studio-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} knowledge workspace</div><h1>Studio</h1><p>Navigate, inspect, clone, preview, and prepare company knowledge for publication.</p></div></header><StudioWorkspace sections={sections} canCreate={actor.permissions.includes("content.create")} canEdit={actor.permissions.includes("content.edit")} /></main>;
}
