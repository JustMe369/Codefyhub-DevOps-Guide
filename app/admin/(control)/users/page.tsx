import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { UserManager } from "@/components/admin/user-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const actor = await requireAdminIdentity(await headers());
  if (!actor.isPlatformAdmin) notFound();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, emailVerified: true, role: true, banned: true, banReason: true, createdAt: true, memberships: { select: { id: true, status: true, company: { select: { id: true, name: true } }, role: { select: { name: true } } }, orderBy: { company: { name: "asc" } } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Platform administration</div><h1>Users</h1><p>Full identity, platform-role, suspension, membership, and account-lifecycle control.</p></div></header><UserManager initialUsers={users} currentUserId={actor.id} /></main>;
}
