import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const memberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  roleId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.view");
    const [members, roles] = await Promise.all([
      prisma.membership.findMany({
        where: { companyId: actor.companyId },
        include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: true },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.companyRole.findMany({ where: { companyId: actor.companyId }, orderBy: { name: "asc" } }),
    ]);
    return NextResponse.json({ members, roles });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const parsed = memberSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid member payload.", issues: parsed.error.flatten() }, { status: 400 });
    const role = await prisma.companyRole.findFirst({
      where: { id: parsed.data.roleId, companyId: actor.companyId },
      include: { permissions: { select: { permissionId: true } } },
    });
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
    if (!actor.isPlatformAdmin && role.permissions.some(({ permissionId }) => !actor.permissions.includes(permissionId))) {
      return NextResponse.json({ error: "You cannot assign a role broader than your own access." }, { status: 403 });
    }

    let user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true } });
    if (!user) {
      const created = await getAuth().api.createUser({ body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, role: "user" } });
      user = { id: created.user.id, email: created.user.email };
    }
    const membership = await prisma.$transaction(async (tx) => {
      const created = await tx.membership.create({ data: { companyId: actor.companyId, userId: user.id, roleId: role.id } });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.create", entityType: "Membership", entityId: created.id, summary: `Added ${user.email} as ${role.name}` },
      });
      return created;
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
