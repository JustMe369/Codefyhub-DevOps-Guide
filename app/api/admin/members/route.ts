import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const email = z.email().transform((value) => value.toLowerCase());
const memberSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("LINK"), email, roleId: z.string().min(1) }),
  z.object({ action: z.literal("INVITE"), name: z.string().trim().min(2).max(100), email, roleId: z.string().min(1) }),
]);

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.view");
    const url = new URL(request.url);
    const page = z.coerce.number().min(1).default(1).parse(url.searchParams.get("page") ?? undefined);
    const limit = z.coerce.number().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? undefined);
    const includeCount = url.searchParams.get("count") !== "false";
    const skip = (page - 1) * limit;

    const [members, invitations, total] = await Promise.all([
      prisma.membership.findMany({
        where: { companyId: actor.companyId },
        include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: true },
        orderBy: { user: { name: "asc" } },
        skip,
        take: limit,
      }),
      prisma.memberInvitation.findMany({
        where: { companyId: actor.companyId, status: "PENDING", expiresAt: { gt: new Date() } },
        select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
      }),
      includeCount ? prisma.membership.count({ where: { companyId: actor.companyId } }) : Promise.resolve(0),
    ]);

    const roles = await prisma.companyRole.findMany({ where: { companyId: actor.companyId }, orderBy: { name: "asc" } });

    const response: Record<string, unknown> = {
      items: members,
      page,
      limit,
      invitations,
      roles,
    };
    if (includeCount) {
      response.total = total;
      response.totalPages = Math.ceil(total / limit);
    }
    return NextResponse.json(response);
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "members.manage");
    const body = await request.json();
    const parsed = memberSchema.safeParse({
      ...body,
      // Keep older internal clients working while the UI moves to the explicit
      // link-versus-invite workflow.
      action: body.action ?? "INVITE",
    });
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
    if (parsed.data.action === "LINK") {
      if (!user) return NextResponse.json({ error: "No platform account uses this email. Invite the person instead." }, { status: 404 });
      const existingMembership = await prisma.membership.findUnique({ where: { companyId_userId: { companyId: actor.companyId, userId: user.id } }, select: { id: true } });
      if (existingMembership) return NextResponse.json({ error: "This user is already linked to the selected company." }, { status: 409 });
      const membership = await prisma.$transaction(async (tx) => {
        await tx.memberInvitation.updateMany({ where: { companyId: actor.companyId, email: user.email, status: "PENDING" }, data: { status: "REVOKED" } });
        const created = await tx.membership.create({
          data: { companyId: actor.companyId, userId: user.id, roleId: role.id },
          include: { user: { select: { id: true, name: true, email: true, emailVerified: true, createdAt: true } }, role: { select: { id: true, name: true, slug: true } } },
        });
        await tx.auditEvent.create({
          data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.link", entityType: "Membership", entityId: created.id, summary: `Linked ${user.email} to ${actor.companyName} as ${role.name}`, metadata: { userId: user.id, role: role.slug } },
        });
        return created;
      });
      return NextResponse.json({ membership, linked: true }, { status: 201 });
    }

    if (user) return NextResponse.json({ error: "A platform account already uses this email. Use Link existing account instead." }, { status: 409 });

    const inviteData = parsed.data;
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.memberInvitation.updateMany({
        where: { companyId: actor.companyId, email: inviteData.email, status: "PENDING" },
        data: { status: "REVOKED" },
      });
      const created = await tx.memberInvitation.create({
        data: { companyId: actor.companyId, roleId: role.id, email: inviteData.email, name: inviteData.name, tokenHash, expiresAt, invitedById: actor.id },
        select: { id: true, email: true, name: true, status: true, expiresAt: true, createdAt: true, role: { select: { id: true, name: true, slug: true } } },
      });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "member.invite", entityType: "MemberInvitation", entityId: created.id, summary: `Invited ${inviteData.email} as ${role.name}`, metadata: { expiresAt: expiresAt.toISOString() } },
      });
      return created;
    });
    const inviteUrl = new URL(`/admin/accept-invite?token=${encodeURIComponent(token)}`, request.url).toString();
    return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
