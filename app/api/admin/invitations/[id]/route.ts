import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const { id } = await context.params;
    const invitation = await prisma.memberInvitation.findFirst({ where: { id, companyId: actor.companyId, status: "PENDING" } });
    if (!invitation) return NextResponse.json({ error: "Pending invitation not found." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.memberInvitation.update({ where: { id }, data: { status: "REVOKED" } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.invite.revoke", entityType: "MemberInvitation", entityId: id, summary: `Revoked invitation for ${invitation.email}` } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
