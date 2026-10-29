import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const payloadSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "The request origin is not trusted." }, { status: 403 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid invitation request." }, { status: 400 });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const invitation = await prisma.memberInvitation.findUnique({ where: { tokenHash }, include: { role: true, company: true } });
  if (!invitation || invitation.status !== "PENDING") return NextResponse.json({ error: "This invitation is invalid or has already been used." }, { status: 404 });
  if (invitation.expiresAt <= new Date()) {
    await prisma.memberInvitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }
  const existing = await prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account already exists for this email. Ask an administrator to grant access directly." }, { status: 409 });

  const created = await getAuth().api.createUser({ body: { name: invitation.name, email: invitation.email, password: parsed.data.password, role: "user" } });
  await prisma.$transaction(async (tx) => {
    await tx.membership.create({ data: { companyId: invitation.companyId, userId: created.user.id, roleId: invitation.roleId } });
    await tx.memberInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: created.user.id } });
    await tx.auditEvent.create({ data: { companyId: invitation.companyId, actorId: created.user.id, actorEmail: invitation.email, action: "member.invite.accept", entityType: "MemberInvitation", entityId: invitation.id, summary: `${invitation.email} accepted an invitation as ${invitation.role.name}` } });
  });
  return NextResponse.json({ ok: true, company: invitation.company.name });
}
