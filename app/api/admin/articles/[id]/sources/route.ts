import { lockArticle } from "@/lib/admin/locking";
import { ArticleConflictError, articleSnapshot } from "@/lib/admin/articles";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({ sourceIds: z.array(z.string().cuid()).max(100), expectedUpdatedAt: z.coerce.date() });

export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "sources.manage");
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid source assignment." }, { status: 400 });
    const sourceIds = [...new Set(parsed.data.sourceIds)];
    const { id } = await context.params;
    const result = await prisma.$transaction(async (tx) => {
      await lockArticle(tx, id, actor.companyId);
      const [article, sourceCount] = await Promise.all([
        tx.article.findFirst({ where: { id, companyId: actor.companyId }, include: { versions: { orderBy: { revision: "desc" }, take: 1 }, section: { select: { slug: true } } } }),
        tx.source.count({ where: { id: { in: sourceIds }, companyId: actor.companyId } }),
      ]);
      if (!article) return null;
      if (article.updatedAt.getTime() !== parsed.data.expectedUpdatedAt.getTime()) throw new ArticleConflictError();
      if (article.status === "PUBLISHED" || ["APPROVED", "IN_REVIEW"].includes(article.reviewStatus)) {
        throw new ArticleConflictError("Save a draft revision before changing reviewed or published evidence.");
      }
      if (sourceCount !== sourceIds.length) throw new Error("One or more sources do not exist.");
      await tx.articleSource.deleteMany({ where: { articleId: id, sourceId: { notIn: sourceIds } } });
      if (sourceIds.length > 0) await tx.articleSource.createMany({ data: sourceIds.map((sourceId) => ({ articleId: id, sourceId })), skipDuplicates: true });
      const updated = await tx.article.update({ where: { id, updatedAt: parsed.data.expectedUpdatedAt }, data: { reviewStatus: "DRAFT", reviewedAt: null, reviewedById: null, reviewNote: null, ...(article.origin === "SOURCE" ? { syncStatus: "MODIFIED" as const } : {}) } });
      await tx.articleVersion.create({ data: { articleId: id, revision: (article.versions[0]?.revision ?? 0) + 1, body: article.body, snapshot: { ...articleSnapshot(updated), sourceIds }, changeSummary: "Updated evidence sources", createdById: actor.id } });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.id,
          actorEmail: actor.email,
          action: "article.sources.update",
          entityType: "Article",
          entityId: id,
          summary: `Updated sources for ${article.section.slug}/${article.slug}`,
          metadata: { sourceIds },
        },
      });
      return { sourceIds, updatedAt: updated.updatedAt };
    });
    if (!result) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
