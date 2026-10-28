import { headers } from "next/headers";
import { RoleManager } from "@/components/admin/role-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { permissionCatalog } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";

export default async function RolesPage() {
  const actor = await requireAdminIdentity(await headers(), "roles.view");
  const roles = await prisma.companyRole.findMany({ where: { companyId: actor.companyId }, include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } }, orderBy: [{ isSystem: "desc" }, { name: "asc" }] });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Least privilege</div><h1>Roles & permissions</h1><p>Protected system roles and company-specific access profiles.</p></div></header><RoleManager initialRoles={roles} permissions={permissionCatalog} canManage={actor.permissions.includes("roles.manage")} /></main>;
}
