import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bulkSchema = z.object({
  action: z.enum(["archive", "delete", "tag"]),
  articleIds: z.array(z.string().cuid()).min(1).max(100),
  tagIds: z.array(z.string().cuid()).max(100).optional(),
  confirmPhrase: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const parsed = bulkSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid bulk payload.", issues: parsed.error.flatten() }, { status: 400 });

    const { action, articleIds, tagIds, confirmPhrase } = parsed.data;

    // Verify all articles belong to this company
    const articles = await prisma.article.findMany({
      where: { id: { in: articleIds }, companyId: actor.companyId },
      select: { id: true, title: true, slug: true, section: { select: { slug: true } } },
    });

    if (articles.length !== articleIds.length) {
      return NextResponse.json({ error: "One or more articles were not found or do not belong to your company." }, { status: 404 });
    }

    if (action === "delete" && !actor.isPlatformAdmin) {
      return NextResponse.json({ error: "Only a platform administrator can permanently delete knowledge." }, { status: 403 });
    }

    if (action === "tag") {
      if (!tagIds || tagIds.length === 0) {
        return NextResponse.json({ error: "Tag IDs are required for the tag action." }, { status: 400 });
      }
      const tagCount = await prisma.tag.count({ where: { id: { in: tagIds }, companyId: actor.companyId } });
      if (tagCount !== tagIds.length) {
        return NextResponse.json({ error: "One or more tags do not exist or do not belong to your company." }, { status: 404 });
      }
    }

    if (action === "delete" && confirmPhrase !== `DELETE ${articles.length} ARTICLES`) {
      return NextResponse.json({ error: `Permanent deletion requires confirmPhrase: DELETE ${articles.length} ARTICLES.` }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const article of articles) {
        if (action === "archive") {
          await tx.article.update({ where: { id: article.id }, data: { status: "ARCHIVED", publishedAt: null } });
          await tx.auditEvent.create({
            data: {
              companyId: actor.companyId,
              actorId: actor.id,
              actorEmail: actor.email,
              action: "article.archive",
              entityType: "Article",
              entityId: article.id,
              summary: `Archived article ${article.title}`,
            },
          });
        } else if (action === "delete") {
          await tx.auditEvent.create({
            data: {
              companyId: actor.companyId,
              actorId: actor.id,
              actorEmail: actor.email,
              action: "article.delete",
              entityType: "Article",
              entityId: article.id,
              summary: `Permanently deleted article ${article.title}`,
            },
          });
          await tx.article.delete({ where: { id: article.id } });
        } else if (action === "tag") {
          await tx.articleTag.deleteMany({ where: { articleId: article.id } });
          if (tagIds!.length > 0) {
            await tx.articleTag.createMany({
              data: tagIds!.map((tagId) => ({ articleId: article.id, tagId })),
            });
          }
          await tx.auditEvent.create({
            data: {
              companyId: actor.companyId,
              actorId: actor.id,
              actorEmail: actor.email,
              action: "article.tags.update",
              entityType: "Article",
              entityId: article.id,
              summary: `Updated tags for ${article.section.slug}/${article.slug}`,
              metadata: { tagIds },
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, count: articles.length });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
