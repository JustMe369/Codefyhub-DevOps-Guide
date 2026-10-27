import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({ sourceIds: z.array(z.string().cuid()).max(100) });

export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid source assignment." }, { status: 400 });
    const sourceIds = [...new Set(parsed.data.sourceIds)];
    const { id } = await context.params;
    const result = await prisma.$transaction(async (tx) => {
      const [article, sourceCount] = await Promise.all([
        tx.article.findUnique({ where: { id }, select: { id: true, slug: true, section: { select: { slug: true } } } }),
        tx.source.count({ where: { id: { in: sourceIds } } }),
      ]);
      if (!article) return null;
      if (sourceCount !== sourceIds.length) throw new Error("One or more sources do not exist.");
      await tx.articleSource.deleteMany({ where: { articleId: id } });
      if (sourceIds.length > 0) await tx.articleSource.createMany({ data: sourceIds.map((sourceId) => ({ articleId: id, sourceId })) });
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: "article.sources.update",
          entityType: "Article",
          entityId: id,
          summary: `Updated sources for ${article.section.slug}/${article.slug}`,
          metadata: { sourceIds },
        },
      });
      return { sourceIds };
    });
    if (!result) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
