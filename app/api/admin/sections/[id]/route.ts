import { NextResponse } from "next/server";
import { sectionSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "structure.manage");
    const parsed = sectionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid section payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const section = await prisma.$transaction(async (tx) => {
      const existing = await tx.section.findFirst({ where: { id, companyId: actor.companyId } });
      if (!existing) throw new Error("Section not found.");
      const updated = await tx.section.update({ where: { id }, data: parsed.data });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "section.update", entityType: "Section", entityId: id, summary: `Updated section ${updated.title}` },
      });
      return updated;
    });
    return NextResponse.json({ section });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "structure.manage");
    const { id } = await context.params;
    const section = await prisma.section.findFirst({ where: { id, companyId: actor.companyId }, include: { _count: { select: { articles: true } } } });
    if (!section) return NextResponse.json({ error: "Section not found." }, { status: 404 });
    if (section._count.articles > 0) return NextResponse.json({ error: "Move or delete the section's articles before deleting the section." }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "section.delete", entityType: "Section", entityId: id, summary: `Deleted section ${section.title}` } });
      await tx.section.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { return adminErrorResponse(error); }
}
