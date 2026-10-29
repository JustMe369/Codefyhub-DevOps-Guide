import { NextResponse } from "next/server";
import { updateArticleSchema } from "@/lib/admin/article-schema";
import { ArticleConflictError, updateArticle } from "@/lib/admin/articles";
import { articleAccessWhere, requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const { id } = await context.params;
    const article = await prisma.article.findFirst({
      where: { id, ...articleAccessWhere(actor) },
      include: {
        section: true,
        versions: { orderBy: { revision: "desc" }, take: 20, include: { createdBy: { select: { name: true, email: true } } } },
        articleSources: { include: { source: true } },
        articleTags: { include: { tag: true } },
      },
    });
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const parsed = updateArticleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid article payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const article = await updateArticle(id, parsed.data, actor);
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const parsed = (await request.json().catch(() => ({}))) as { permanent?: boolean; confirmTitle?: string };
    const { id } = await context.params;
    const article = await prisma.article.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true, title: true } });
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    if (parsed.permanent) {
      if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Only a platform administrator can permanently delete knowledge." }, { status: 403 });
      if (parsed.confirmTitle !== article.title) return NextResponse.json({ error: "The confirmation title does not match." }, { status: 400 });
      await prisma.$transaction(async (tx) => {
        await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.delete", entityType: "Article", entityId: id, summary: `Permanently deleted article ${article.title}` } });
        await tx.article.delete({ where: { id } });
      });
      return NextResponse.json({ ok: true, permanent: true });
    }
    const archived = await prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({ where: { id }, data: { status: "ARCHIVED", publishedAt: null } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.archive", entityType: "Article", entityId: id, summary: `Archived article ${article.title}` } });
      return updated;
    });
    return NextResponse.json({ article: archived });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
