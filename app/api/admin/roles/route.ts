import { NextResponse } from "next/server";
import { z } from "zod";
import { permissionCatalog } from "@/lib/admin/permissions";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const roleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(5).max(240),
  permissions: z.array(z.enum(permissionCatalog.map(({ key }) => key))).min(1),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "roles.view");
    const url = new URL(request.url);
    const page = z.coerce.number().min(1).default(1).parse(url.searchParams.get("page") ?? undefined);
    const limit = z.coerce.number().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? undefined);
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      prisma.companyRole.findMany({
        where: { companyId: actor.companyId },
        include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.companyRole.count({ where: { companyId: actor.companyId } }),
    ]);
    return NextResponse.json({ roles, page, limit, total, totalPages: Math.ceil(total / limit), permissions: permissionCatalog });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "roles.manage");
    const parsed = roleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid role payload.", issues: parsed.error.flatten() }, { status: 400 });
    if (!actor.isPlatformAdmin && parsed.data.permissions.some((permission) => !actor.permissions.includes(permission))) {
      return NextResponse.json({ error: "A role cannot grant permissions you do not possess." }, { status: 403 });
    }
    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.companyRole.create({
        data: { companyId: actor.companyId, name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description },
      });
      await tx.rolePermission.createMany({ data: parsed.data.permissions.map((permissionId) => ({ roleId: created.id, permissionId })) });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "role.create", entityType: "CompanyRole", entityId: created.id, summary: `Created role ${created.name}`, metadata: { permissions: parsed.data.permissions } },
      });
      return created;
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
