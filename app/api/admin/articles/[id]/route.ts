import { NextResponse } from "next/server";
import { updateArticleSchema } from "@/lib/admin/article-schema";
import { ArticleConflictError, updateArticle } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    await requireAdminIdentity(request.headers);
    const { id } = await context.params;
    const article = await prisma.article.findUnique({
      where: { id },
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
    const actor = await requireAdminIdentity(request.headers);
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
