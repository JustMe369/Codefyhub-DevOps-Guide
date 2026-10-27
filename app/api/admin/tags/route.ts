import { NextResponse } from "next/server";
import { tagSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminIdentity(request.headers);
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { articleTags: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ tags });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    const parsed = tagSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid tag payload.", issues: parsed.error.flatten() }, { status: 400 });
    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({ data: parsed.data });
      await tx.auditEvent.create({
        data: { actorId: actor.id, actorEmail: actor.email, action: "tag.create", entityType: "Tag", entityId: created.id, summary: `Created tag ${created.name}` },
      });
      return created;
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
