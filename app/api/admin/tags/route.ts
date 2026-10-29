import { NextResponse } from "next/server";
import { z } from "zod";
import { tagSchema } from "@/lib/admin/catalog-schema";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const url = new URL(request.url);
    const page = z.coerce.number().min(1).default(1).parse(url.searchParams.get("page") ?? undefined);
    const limit = z.coerce.number().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? undefined);
    const skip = (page - 1) * limit;

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where: { companyId: actor.companyId },
        include: { _count: { select: { articleTags: true } } },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.tag.count({ where: { companyId: actor.companyId } }),
    ]);
    return NextResponse.json({ tags, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "structure.manage");
    const parsed = tagSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid tag payload.", issues: parsed.error.flatten() }, { status: 400 });
    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({ data: { ...parsed.data, companyId: actor.companyId } });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "tag.create", entityType: "Tag", entityId: created.id, summary: `Created tag ${created.name}` },
      });
      return created;
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
