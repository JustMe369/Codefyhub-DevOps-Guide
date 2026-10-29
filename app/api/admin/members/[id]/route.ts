import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({ roleId: z.string().min(1), status: z.enum(["ACTIVE", "SUSPENDED"]) });

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid membership payload." }, { status: 400 });
    const { id } = await context.params;
    const [membership, nextRole] = await Promise.all([
      prisma.membership.findFirst({ where: { id, companyId: actor.companyId }, include: { role: true, user: true } }),
      prisma.companyRole.findFirst({ where: { id: parsed.data.roleId, companyId: actor.companyId }, include: { permissions: { select: { permissionId: true } } } }),
    ]);
    if (!membership || !nextRole) return NextResponse.json({ error: "Membership or role not found." }, { status: 404 });
    if (membership.userId === actor.id && parsed.data.status === "SUSPENDED") {
      return NextResponse.json({ error: "You cannot suspend your own membership." }, { status: 409 });
    }
    if (!actor.isPlatformAdmin && nextRole.permissions.some(({ permissionId }) => !actor.permissions.includes(permissionId))) {
      return NextResponse.json({ error: "You cannot assign a role broader than your own access." }, { status: 403 });
    }
    const removesOwner = membership.role.slug === "company-owner" && (nextRole.slug !== "company-owner" || parsed.data.status !== "ACTIVE");
    if (removesOwner) {
      const otherOwners = await prisma.membership.count({ where: { companyId: actor.companyId, id: { not: id }, status: "ACTIVE", role: { slug: "company-owner" } } });
      if (otherOwners === 0) return NextResponse.json({ error: "The last active company owner cannot be removed or suspended." }, { status: 409 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.membership.update({ where: { id }, data: { roleId: nextRole.id, status: parsed.data.status, accessVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: membership.userId } });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.update", entityType: "Membership", entityId: id, summary: `Updated ${membership.user.email} to ${nextRole.name} (${parsed.data.status})`, metadata: { previousRole: membership.role.slug, nextRole: nextRole.slug, status: parsed.data.status } },
      });
      return row;
    });
    return NextResponse.json({ membership: updated });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const { id } = await context.params;
    const membership = await prisma.membership.findFirst({ where: { id, companyId: actor.companyId }, include: { role: true, user: true } });
    if (!membership) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    if (membership.userId === actor.id) return NextResponse.json({ error: "You cannot remove your own company access." }, { status: 409 });
    if (membership.role.slug === "company-owner") {
      const otherOwners = await prisma.membership.count({ where: { companyId: actor.companyId, id: { not: id }, status: "ACTIVE", role: { slug: "company-owner" } } });
      if (otherOwners === 0) return NextResponse.json({ error: "The final active company owner cannot be removed." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.delete", entityType: "Membership", entityId: id, summary: `Removed ${membership.user.email} from the company`, metadata: { role: membership.role.slug } } });
      await tx.membership.delete({ where: { id } });
      await tx.session.deleteMany({ where: { userId: membership.userId } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
