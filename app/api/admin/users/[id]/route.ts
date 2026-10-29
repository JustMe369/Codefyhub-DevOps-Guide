import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((email) => email.toLowerCase()),
  platformRole: z.enum(["admin", "user"]),
  banned: z.boolean(),
  banReason: z.string().trim().max(240).nullable(),
});

async function platformActor(headers: Headers) {
  const actor = await requireAdminIdentity(headers);
  return actor.isPlatformAdmin ? actor : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await platformActor(request.headers);
    if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid user payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, emailVerified: true, role: true, banned: true } });
    if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const removesOwnAccess = id === actor.id && (parsed.data.platformRole !== "admin" || parsed.data.banned);
    if (removesOwnAccess) return NextResponse.json({ error: "You cannot demote or ban your own administrator account." }, { status: 409 });
    const wasAdmin = existing.role?.split(",").includes("admin") ?? false;
    if (wasAdmin && parsed.data.platformRole !== "admin") {
      const otherAdmins = await prisma.user.count({ where: { id: { not: id }, role: { contains: "admin" }, banned: { not: true } } });
      if (otherAdmins === 0) return NextResponse.json({ error: "The final active platform administrator cannot be demoted." }, { status: 409 });
    }
    const user = await prisma.$transaction(async (tx) => {
      const emailChanged = existing.email !== parsed.data.email;
      const updated = await tx.user.update({ where: { id }, data: { name: parsed.data.name, email: parsed.data.email, emailVerified: emailChanged ? false : existing.emailVerified, role: parsed.data.platformRole, banned: parsed.data.banned, banReason: parsed.data.banned ? parsed.data.banReason || "Suspended by platform administrator" : null, banExpires: null } });
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "user.update", entityType: "User", entityId: id, summary: `Updated user ${updated.email}`, metadata: { before: existing, after: { name: updated.name, email: updated.email, role: updated.role, banned: updated.banned } } } });
      return updated;
    });
    return NextResponse.json({ user, requiresSignIn: id === actor.id && existing.email !== user.email });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await platformActor(request.headers);
    if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = z.object({ confirmEmail: z.email() }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Account deletion requires the exact email address." }, { status: 400 });
    const { id } = await context.params;
    if (id === actor.id) return NextResponse.json({ error: "You cannot delete your own administrator account." }, { status: 409 });
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: "The confirmation email does not match." }, { status: 400 });
    if (user.role?.split(",").includes("admin")) {
      const otherAdmins = await prisma.user.count({ where: { id: { not: id }, role: { contains: "admin" }, banned: { not: true } } });
      if (otherAdmins === 0) return NextResponse.json({ error: "The final active platform administrator cannot be deleted." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "user.delete", entityType: "User", entityId: id, summary: `Permanently deleted user ${user.email}`, metadata: { name: user.name, role: user.role } } });
      await tx.user.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
