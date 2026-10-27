import { NextResponse } from "next/server";
import { z } from "zod";
import { ArticleConflictError, publishArticle } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({ expectedUpdatedAt: z.coerce.date() });

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid publication payload." }, { status: 400 });
    const { id } = await context.params;
    const article = await publishArticle(id, parsed.data.expectedUpdatedAt, actor);
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
