import { NextResponse } from "next/server";
import { z } from "zod";
import { permissionCatalog } from "@/lib/admin/permissions";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const permissionValues = permissionCatalog.map(({ key }) => key);
const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(240),
  permissions: z.array(z.string()).min(1).refine((items) => items.every((item) => permissionValues.includes(item as never))),
});

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "roles.manage");
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid role payload." }, { status: 400 });
    const { id } = await context.params;
    const current = await prisma.companyRole.findFirst({ where: { id, companyId: actor.companyId } });
    if (!current) return NextResponse.json({ error: "Role not found." }, { status: 404 });
    if (current.isSystem) return NextResponse.json({ error: "System roles are protected." }, { status: 409 });
    if (!actor.isPlatformAdmin && parsed.data.permissions.some((permission) => !actor.permissions.includes(permission))) {
      return NextResponse.json({ error: "A role cannot grant permissions you do not possess." }, { status: 403 });
    }
    const role = await prisma.$transaction(async (tx) => {
      const updated = await tx.companyRole.update({ where: { id }, data: { name: parsed.data.name, description: parsed.data.description } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({ data: parsed.data.permissions.map((permissionId) => ({ roleId: id, permissionId })) });
      const affected = await tx.membership.findMany({ where: { roleId: id }, select: { userId: true } });
      await tx.membership.updateMany({ where: { roleId: id }, data: { accessVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: { in: affected.map(({ userId }) => userId) } } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "role.update", entityType: "CompanyRole", entityId: id, summary: `Updated role ${updated.name}`, metadata: { permissions: parsed.data.permissions } } });
      return updated;
    });
    return NextResponse.json({ role });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "roles.manage");
    const { id } = await context.params;
    const role = await prisma.companyRole.findFirst({ where: { id, companyId: actor.companyId }, include: { _count: { select: { memberships: true } } } });
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
    if (role.isSystem) return NextResponse.json({ error: "System roles are protected." }, { status: 409 });
    if (role._count.memberships > 0) return NextResponse.json({ error: "Move all members to another role before deleting it." }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await tx.companyRole.delete({ where: { id } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "role.delete", entityType: "CompanyRole", entityId: id, summary: `Deleted role ${role.name}` } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
