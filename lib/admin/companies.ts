import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { permissionCatalog, systemRoleTemplates } from "@/lib/admin/permissions";

export async function provisionCompanyAccess(tx: Prisma.TransactionClient, companyId: string) {
  for (const permission of permissionCatalog) {
    await tx.permission.upsert({ where: { key: permission.key }, update: permission, create: permission });
  }

  for (const template of systemRoleTemplates) {
    const role = await tx.companyRole.create({
      data: {
        companyId,
        name: template.name,
        slug: template.slug,
        description: template.description,
        isSystem: true,
      },
    });
    await tx.rolePermission.createMany({
      data: template.permissions.map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }
}
