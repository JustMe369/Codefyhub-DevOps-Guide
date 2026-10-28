import type { AdminIdentity } from "@/lib/admin/authz";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { createArticleSchema, updateArticleSchema } from "@/lib/admin/article-schema";

type CreateArticleInput = z.infer<typeof createArticleSchema>;
type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export class ArticleConflictError extends Error {
  constructor(message = "The article changed after this editor was opened.") {
    super(message);
    this.name = "ArticleConflictError";
  }
}

function articleSnapshot(article: {
  title: string;
  description: string;
  difficulty: string;
  contentType: string;
  validationStatus: string;
  readingMinutes: number;
  status: string;
  lastVerifiedAt: Date;
  verifiedBy: string;
  verificationMethod: string;
  testedVersions: string;
}) {
  return {
    title: article.title,
    description: article.description,
    difficulty: article.difficulty,
    contentType: article.contentType,
    validationStatus: article.validationStatus,
    readingMinutes: article.readingMinutes,
    status: article.status,
    lastVerifiedAt: article.lastVerifiedAt.toISOString(),
    verifiedBy: article.verifiedBy,
    verificationMethod: article.verificationMethod,
    testedVersions: article.testedVersions,
  };
}

export async function createArticle(input: CreateArticleInput, actor: AdminIdentity) {
  const { changeSummary, ...fields } = input;
  return prisma.$transaction(async (tx) => {
    const section = await tx.section.findFirst({ where: { id: fields.sectionId, companyId: actor.companyId }, select: { id: true, slug: true } });
    if (!section) throw new Error("Section not found.");

    const order = fields.order ?? ((await tx.article.aggregate({ where: { sectionId: section.id }, _max: { order: true } }))._max.order ?? 0) + 1;
    const article = await tx.article.create({
      data: {
        ...fields,
        companyId: actor.companyId,
        order,
        status: "DRAFT",
        publishedAt: null,
      },
    });
    await tx.articleVersion.create({
      data: {
        articleId: article.id,
        revision: 1,
        body: article.body,
        changeSummary,
        snapshot: articleSnapshot(article),
        createdById: actor.id,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: "article.create",
        entityType: "Article",
        entityId: article.id,
        summary: `Created draft ${section.slug}/${article.slug}`,
        metadata: { changeSummary },
      },
    });
    return article;
  });
}

export async function updateArticle(id: string, input: UpdateArticleInput, actor: AdminIdentity) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.article.findFirst({
      where: { id, companyId: actor.companyId },
      include: { versions: { orderBy: { revision: "desc" }, take: 1 }, section: { select: { slug: true } } },
    });
    if (!current) return null;
    if (current.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()) throw new ArticleConflictError();

    const article = await tx.article.update({ where: { id }, data: input.data });
    const revision = (current.versions[0]?.revision ?? 0) + 1;
    await tx.articleVersion.create({
      data: {
        articleId: id,
        revision,
        body: article.body,
        changeSummary: input.changeSummary,
        snapshot: articleSnapshot(article),
        createdById: actor.id,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: "article.update",
        entityType: "Article",
        entityId: id,
        summary: `Saved revision ${revision} for ${current.section.slug}/${article.slug}`,
        metadata: { changeSummary: input.changeSummary, revision },
      },
    });
    return article;
  });
}

export async function publishArticle(id: string, expectedUpdatedAt: Date, actor: AdminIdentity) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.article.findFirst({
      where: { id, companyId: actor.companyId },
      include: { articleSources: { select: { sourceId: true } }, section: { select: { slug: true } } },
    });
    if (!current) return null;
    if (current.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new ArticleConflictError();
    if (current.validationStatus === "DRAFT") throw new ArticleConflictError("Source review is required before publication.");
    if (current.articleSources.length === 0) throw new ArticleConflictError("At least one source is required before publication.");

    const article = await tx.article.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: current.publishedAt ?? new Date() },
    });
    await tx.auditEvent.create({
      data: {
        companyId: actor.companyId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: "article.publish",
        entityType: "Article",
        entityId: id,
        summary: `Published ${current.section.slug}/${article.slug}`,
        metadata: { validationStatus: article.validationStatus },
      },
    });
    return article;
  });
}
