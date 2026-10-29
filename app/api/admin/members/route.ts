import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const memberSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((email) => email.toLowerCase()),
  roleId: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.view");
    const [members, roles, invitations] = await Promise.all([
      prisma.membership.findMany({
        where: { companyId: actor.companyId },
        include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: true },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.companyRole.findMany({ where: { companyId: actor.companyId }, orderBy: { name: "asc" } }),
      prisma.memberInvitation.findMany({
        where: { companyId: actor.companyId, status: "PENDING", expiresAt: { gt: new Date() } },
        select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json({ members, roles, invitations });
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

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true } });
    if (user) {
      const membership = await prisma.$transaction(async (tx) => {
        const created = await tx.membership.create({ data: { companyId: actor.companyId, userId: user.id, roleId: role.id } });
        await tx.auditEvent.create({
          data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.create", entityType: "Membership", entityId: created.id, summary: `Granted ${user.email} access as ${role.name}` },
        });
        return created;
      });
      return NextResponse.json({ membership, existingAccount: true }, { status: 201 });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.memberInvitation.updateMany({
        where: { companyId: actor.companyId, email: parsed.data.email, status: "PENDING" },
        data: { status: "REVOKED" },
      });
      const created = await tx.memberInvitation.create({
        data: { companyId: actor.companyId, roleId: role.id, email: parsed.data.email, name: parsed.data.name, tokenHash, expiresAt, invitedById: actor.id },
        select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } },
      });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.invite", entityType: "MemberInvitation", entityId: created.id, summary: `Invited ${parsed.data.email} as ${role.name}`, metadata: { expiresAt: expiresAt.toISOString() } },
      });
      return created;
    });
    const inviteUrl = new URL(`/admin/accept-invite?token=${encodeURIComponent(token)}`, request.url).toString();
    return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
