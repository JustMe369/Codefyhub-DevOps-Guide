import { NextResponse } from "next/server";
import { tagSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    const parsed = tagSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid tag payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const tag = await prisma.$transaction(async (tx) => {
      const updated = await tx.tag.update({ where: { id }, data: parsed.data });
      await tx.auditEvent.create({
        data: { actorId: actor.id, actorEmail: actor.email, action: "tag.update", entityType: "Tag", entityId: id, summary: `Updated tag ${updated.name}` },
      });
      return updated;
    });
    return NextResponse.json({ tag });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
