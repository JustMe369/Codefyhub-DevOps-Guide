import { NextResponse } from "next/server";
import { sectionSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const sections = await prisma.section.findMany({ where: { companyId: actor.companyId }, include: { _count: { select: { articles: true } } }, orderBy: { order: "asc" } });
    return NextResponse.json({ sections });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "structure.manage");
    const parsed = sectionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid section payload.", issues: parsed.error.flatten() }, { status: 400 });
    const section = await prisma.$transaction(async (tx) => {
      const created = await tx.section.create({ data: { ...parsed.data, companyId: actor.companyId } });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "section.create", entityType: "Section", entityId: created.id, summary: `Created section ${created.title}` },
      });
      return created;
    });
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
