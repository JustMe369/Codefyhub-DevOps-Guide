import { headers } from "next/headers";
import { MemberManager } from "@/components/admin/member-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function MembersPage() {
  const actor = await requireAdminIdentity(await headers(), "members.view");
  const [members, roles, invitations, companies] = await Promise.all([
    prisma.membership.findMany({ where: { companyId: actor.companyId }, include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: { select: { id: true, name: true, slug: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.companyRole.findMany({ where: { companyId: actor.companyId }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.memberInvitation.findMany({ where: { companyId: actor.companyId, status: "PENDING", expiresAt: { gt: new Date() } }, select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" } }),
    actor.isPlatformAdmin
      ? prisma.company.findMany({
          select: { id: true, name: true, slug: true, status: true, _count: { select: { memberships: true } } },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.isPlatformAdmin ? "Platform access control" : `${actor.companyName} access`}</div><h1>Members</h1><p>{actor.isPlatformAdmin ? "Choose a company, then link existing platform users or invite new people with company-scoped roles." : "Link existing platform users to this company, invite new people, assign company-scoped roles, and revoke access safely."}</p></div></header><MemberManager key={actor.companyId} initialMembers={members} initialInvitations={invitations} roles={roles} canManage={actor.permissions.includes("members.manage")} currentUserId={actor.id} activeCompanyId={actor.companyId} activeCompanyName={actor.companyName} companies={companies} /></main>;
}
