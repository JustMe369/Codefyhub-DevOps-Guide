import { headers } from "next/headers";
import { StudioWorkspace } from "@/components/admin/studio-workspace";
import { StudioSectionManager } from "@/components/admin/studio-section-manager";
import { articleAccessWhere, requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function StudioPage() {
  const actor = await requireAdminIdentity(await headers(), "content.view");
  const articleAccess = articleAccessWhere(actor);
  const sections = await prisma.section.findMany({
    where: { companyId: actor.companyId },
    select: { id: true, title: true, slug: true, summary: true, icon: true, order: true, status: true, _count: { select: { articles: true } }, articles: { where: { ...articleAccess, status: { not: "ARCHIVED" } }, select: { id: true, title: true, slug: true, status: true, validationStatus: true, reviewStatus: true, updatedAt: true }, orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return <main className="admin-page admin-studio-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} knowledge workspace</div><h1>Studio</h1><p>Manage your content structure, inspect drafts, preview layouts, and prepare knowledge for publication.</p></div></header><StudioSectionManager sections={sections} canManage={actor.permissions.includes("structure.manage")} /><StudioWorkspace sections={sections.filter((section) => section.status !== "ARCHIVED")} canCreate={actor.permissions.includes("content.create")} canEdit={actor.permissions.includes("content.edit")} canReview={actor.permissions.includes("content.review")} canPublish={actor.permissions.includes("content.publish")} /></main>;
}
