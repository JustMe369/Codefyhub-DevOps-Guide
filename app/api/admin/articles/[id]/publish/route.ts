import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { ArticleConflictError, publishArticle } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { reindexArticle } from "@/lib/search-embeddings";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({ expectedUpdatedAt: z.coerce.date() });

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.publish");
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid publication payload." }, { status: 400 });
    const { id } = await context.params;
    const article = await publishArticle(id, parsed.data.expectedUpdatedAt, actor);
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    after(async () => {
      try {
        await reindexArticle(article.id);
      } catch (error) {
        console.error(JSON.stringify({ event: "article_embedding_failed", articleId: article.id, error: error instanceof Error ? error.message : String(error) }));
      }
    });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
