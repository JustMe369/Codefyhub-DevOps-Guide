import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.create");
    const { id } = await context.params;
    const source = await prisma.article.findFirst({
      where: { id, companyId: actor.companyId },
      include: { articleSources: true, articleTags: true, section: { select: { slug: true } } },
    });
    if (!source) return NextResponse.json({ error: "Article not found." }, { status: 404 });

    const clone = await prisma.$transaction(async (tx) => {
      const siblings = await tx.article.findMany({ where: { sectionId: source.sectionId, slug: { startsWith: `${source.slug}-copy` } }, select: { slug: true } });
      let suffix = siblings.length + 1;
      let slug = `${source.slug}-copy`;
      const used = new Set(siblings.map((item) => item.slug));
      while (used.has(slug)) slug = `${source.slug}-copy-${++suffix}`;
      const maxOrder = await tx.article.aggregate({ where: { sectionId: source.sectionId }, _max: { order: true } });
      const created = await tx.article.create({
        data: {
          companyId: actor.companyId,
          sectionId: source.sectionId,
          slug,
          title: `${source.title} — Copy`,
          description: source.description,
          body: source.body,
          difficulty: source.difficulty,
          contentType: source.contentType,
          validationStatus: "DRAFT",
          applicablePlatforms: source.applicablePlatforms,
          applicableVersions: source.applicableVersions,
          prerequisites: source.prerequisites,
          relatedGuides: source.relatedGuides,
          testedAt: source.testedAt,
          testEnvironment: source.testEnvironment,
          readingMinutes: source.readingMinutes,
          order: (maxOrder._max.order ?? 0) + 1,
          status: "DRAFT",
          visibility: "INTERNAL",
          publishedAt: null,
          lastVerifiedAt: source.lastVerifiedAt,
          verifiedBy: source.verifiedBy,
          verificationMethod: source.verificationMethod,
          testedVersions: source.testedVersions,
          articleSources: { createMany: { data: source.articleSources.map(({ sourceId, note, claimScope }) => ({ sourceId, note, claimScope })) } },
          articleTags: { createMany: { data: source.articleTags.map(({ tagId }) => ({ tagId })) } },
        },
      });
      await tx.articleVersion.create({ data: { articleId: created.id, revision: 1, body: created.body, changeSummary: `Cloned from ${source.section.slug}/${source.slug}`, createdById: actor.id } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.clone", entityType: "Article", entityId: created.id, summary: `Cloned ${source.section.slug}/${source.slug} into draft ${slug}`, metadata: { sourceArticleId: source.id } } });
      return created;
    });
    return NextResponse.json({ article: clone }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
