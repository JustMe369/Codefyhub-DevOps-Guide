import { headers } from "next/headers";
import { MemberManager } from "@/components/admin/member-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const actor = await requireAdminIdentity(await headers(), "members.view");
  const requestedCompanyId = (await searchParams).companyId;
  const companies = actor.isPlatformAdmin
    ? await prisma.company.findMany({
        select: { id: true, name: true, slug: true, status: true, _count: { select: { memberships: true } } },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      })
    : [];
  const requestedCompany = companies.find((company) => company.id === requestedCompanyId && company.status === "ACTIVE");
  const targetCompany = requestedCompany ?? { id: actor.companyId, name: actor.companyName };
  const [members, roles, invitations] = await Promise.all([
    prisma.membership.findMany({ where: { companyId: targetCompany.id }, include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: { select: { id: true, name: true, slug: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.companyRole.findMany({ where: { companyId: targetCompany.id }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.memberInvitation.findMany({ where: { companyId: targetCompany.id, status: "PENDING", expiresAt: { gt: new Date() } }, select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.isPlatformAdmin ? "Platform access control" : `${actor.companyName} access`}</div><h1>Members</h1><p>{actor.isPlatformAdmin ? "Choose a company, then link existing platform users or invite new people with company-scoped roles." : "Link existing platform users to this company, invite new people, assign company-scoped roles, and revoke access safely."}</p></div></header><MemberManager key={targetCompany.id} initialMembers={members} initialInvitations={invitations} roles={roles} canManage={actor.permissions.includes("members.manage")} currentUserId={actor.id} activeCompanyId={targetCompany.id} activeCompanyName={targetCompany.name} companies={companies} /></main>;
}
