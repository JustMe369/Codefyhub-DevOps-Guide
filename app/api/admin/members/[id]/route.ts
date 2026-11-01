import { lockCompany } from "@/lib/admin/locking";
import { ArticleConflictError } from "@/lib/admin/articles";
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
    const membership = await prisma.membership.findUnique({ where: { id }, include: { role: true, user: true } });
    if (!membership || (!actor.isPlatformAdmin && membership.companyId !== actor.companyId)) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    const nextRole = await prisma.companyRole.findFirst({ where: { id: parsed.data.roleId, companyId: membership.companyId }, include: { permissions: { select: { permissionId: true } } } });
    if (!nextRole) return NextResponse.json({ error: "Role not found for this company." }, { status: 404 });
    if (membership.userId === actor.id && parsed.data.status === "SUSPENDED") {
      return NextResponse.json({ error: "You cannot suspend your own membership." }, { status: 409 });
    }
    if (!actor.isPlatformAdmin && nextRole.permissions.some(({ permissionId }) => !actor.permissions.includes(permissionId))) {
      return NextResponse.json({ error: "You cannot assign a role broader than your own access." }, { status: 403 });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await lockCompany(tx, membership.companyId);
      const current = await tx.membership.findUnique({ where: { id }, include: { role: true } });
      if (!current) throw new ArticleConflictError("Membership changed. Refresh and try again.");
      const removesOwner = current.status === "ACTIVE" && current.role.slug === "company-owner" && (nextRole.slug !== "company-owner" || parsed.data.status !== "ACTIVE");
      if (removesOwner && await tx.membership.count({ where: { companyId: membership.companyId, id: { not: id }, status: "ACTIVE", role: { slug: "company-owner" } } }) === 0) {
        throw new ArticleConflictError("The last active company owner cannot be removed or suspended.");
      }
      const row = await tx.membership.update({ where: { id }, data: { roleId: nextRole.id, status: parsed.data.status, accessVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: membership.userId } });
      await tx.auditEvent.create({
        data: { companyId: membership.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.update", entityType: "Membership", entityId: id, summary: `Updated ${membership.user.email} to ${nextRole.name} (${parsed.data.status})`, metadata: { previousRole: membership.role.slug, nextRole: nextRole.slug, status: parsed.data.status } },
      });
      return row;
    });
    return NextResponse.json({ membership: updated });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const { id } = await context.params;
    const membership = await prisma.membership.findUnique({ where: { id }, include: { role: true, user: true } });
    if (!membership || (!actor.isPlatformAdmin && membership.companyId !== actor.companyId)) return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    if (membership.userId === actor.id) return NextResponse.json({ error: "You cannot remove your own company access." }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await lockCompany(tx, membership.companyId);
      const current = await tx.membership.findUnique({ where: { id }, include: { role: true } });
      if (!current) throw new ArticleConflictError("Membership changed. Refresh and try again.");
      if (current.status === "ACTIVE" && current.role.slug === "company-owner" && await tx.membership.count({ where: { companyId: membership.companyId, id: { not: id }, status: "ACTIVE", role: { slug: "company-owner" } } }) === 0) {
        throw new ArticleConflictError("The last active company owner cannot be removed.");
      }
      await tx.auditEvent.create({ data: { companyId: membership.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.delete", entityType: "Membership", entityId: id, summary: `Removed ${membership.user.email} from the company`, metadata: { role: membership.role.slug } } });
      await tx.membership.delete({ where: { id } });
      await tx.session.deleteMany({ where: { userId: membership.userId } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
