import { NextResponse } from "next/server";
import { sectionSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    const parsed = sectionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid section payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const section = await prisma.$transaction(async (tx) => {
      const updated = await tx.section.update({ where: { id }, data: parsed.data });
      await tx.auditEvent.create({
        data: { actorId: actor.id, actorEmail: actor.email, action: "section.update", entityType: "Section", entityId: id, summary: `Updated section ${updated.title}` },
      });
      return updated;
    });
    return NextResponse.json({ section });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
