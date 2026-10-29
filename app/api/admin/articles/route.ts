import { NextResponse } from "next/server";
import { createArticleSchema, listArticlesSchema } from "@/lib/admin/article-schema";
import { createArticle } from "@/lib/admin/articles";
import { articleAccessWhere, requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const parsed = listArticlesSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Invalid article filters.", issues: parsed.error.flatten() }, { status: 400 });
    const { q, status, section, page, limit } = parsed.data;
    const where = {
      ...articleAccessWhere(actor),
      ...(status ? { status } : {}),
      ...(section ? { section: { slug: section } } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: { section: { select: { slug: true, title: true } }, _count: { select: { versions: true, articleSources: true } } },
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.create");
    const parsed = createArticleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid article payload.", issues: parsed.error.flatten() }, { status: 400 });
    const article = await createArticle(parsed.data, actor);
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
