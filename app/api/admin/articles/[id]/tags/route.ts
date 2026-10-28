import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({ tagIds: z.array(z.string().cuid()).max(100) });

export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid tag assignment." }, { status: 400 });
    const tagIds = [...new Set(parsed.data.tagIds)];
    const { id } = await context.params;
    const result = await prisma.$transaction(async (tx) => {
      const [article, tagCount] = await Promise.all([
        tx.article.findFirst({ where: { id, companyId: actor.companyId }, select: { id: true, slug: true, section: { select: { slug: true } } } }),
        tx.tag.count({ where: { id: { in: tagIds }, companyId: actor.companyId } }),
      ]);
      if (!article) return null;
      if (tagCount !== tagIds.length) throw new Error("One or more tags do not exist.");
      await tx.articleTag.deleteMany({ where: { articleId: id } });
      if (tagIds.length > 0) await tx.articleTag.createMany({ data: tagIds.map((tagId) => ({ articleId: id, tagId })) });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.tags.update", entityType: "Article", entityId: id, summary: `Updated tags for ${article.section.slug}/${article.slug}`, metadata: { tagIds } },
      });
      return { tagIds };
    });
    if (!result) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
