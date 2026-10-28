import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const sourceSchema = z.object({
  title: z.string().trim().min(3).max(240),
  organization: z.string().trim().min(2).max(160),
  url: z.url().max(2_000),
  sourceType: z.string().trim().min(2).max(80),
  accessedAt: z.coerce.date(),
  lastVerifiedAt: z.coerce.date(),
  verifiedBy: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
    const sources = await prisma.source.findMany({
      where: { companyId: actor.companyId, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { organization: { contains: q, mode: "insensitive" as const } }, { url: { contains: q, mode: "insensitive" as const } }] } : {}) },
      include: { _count: { select: { articleSources: true } } },
      orderBy: [{ organization: "asc" }, { title: "asc" }],
      take: 100,
    });
    return NextResponse.json({ sources });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "sources.manage");
    const parsed = sourceSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid source payload.", issues: parsed.error.flatten() }, { status: 400 });
    const source = await prisma.$transaction(async (tx) => {
      const created = await tx.source.create({ data: { ...parsed.data, companyId: actor.companyId } });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.id,
          actorEmail: actor.email,
          action: "source.create",
          entityType: "Source",
          entityId: created.id,
          summary: `Added source ${created.title}`,
          metadata: { organization: created.organization, url: created.url },
        },
      });
      return created;
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
