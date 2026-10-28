import { headers } from "next/headers";
import { MemberManager } from "@/components/admin/member-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function MembersPage() {
  const actor = await requireAdminIdentity(await headers(), "members.view");
  const [members, roles] = await Promise.all([
    prisma.membership.findMany({ where: { companyId: actor.companyId }, include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: { select: { id: true, name: true, slug: true } } }, orderBy: { user: { name: "asc" } } }),
    prisma.companyRole.findMany({ where: { companyId: actor.companyId }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">{actor.companyName} access</div><h1>Members</h1><p>Company membership, scoped roles, suspension, and immediate session revocation.</p></div></header><MemberManager initialMembers={members} roles={roles} canManage={actor.permissions.includes("members.manage")} /></main>;
}
