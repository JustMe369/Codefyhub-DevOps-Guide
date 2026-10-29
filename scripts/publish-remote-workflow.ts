import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ContentStatus,
  ContentType,
  ContentVisibility,
  Difficulty,
  PrismaClient,
  ReviewStatus,
  ValidationStatus,
} from "../generated/prisma/client";
import { loadSourceArticles, repositoryRoot } from "../lib/content/source-content";

config({ path: process.env.CONTENT_ENV_FILE ?? ".env.local" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to publish the remote-access workflow.");

const companyId = "codefyhub-company";
const sectionDefinition = {
  slug: "devops-department",
  title: "DevOps Department",
  summary: "Approved Codefyhub operating workflows for development environments, access, delivery, and support.",
  icon: "Workflow",
  order: 13,
};
const sourceDefinitions = [
  {
    title: "Ubuntu Desktop remote desktop documentation",
    organization: "Canonical",
    url: "https://documentation.ubuntu.com/desktop/en/24.04/how-to/share-your-desktop-remotely/",
    sourceType: "official documentation",
  },
  {
    title: "Windows App remote PC documentation",
    organization: "Microsoft",
    url: "https://learn.microsoft.com/en-us/windows-app/get-started-connect-devices-desktops-apps?pivots=remote-pc",
    sourceType: "official documentation",
  },
] as const;

const [article] = loadSourceArticles(`${repositoryRoot}/site_content/devops-department/manifest.json`);
if (!article || article.section !== sectionDefinition.slug) throw new Error("The DevOps workflow manifest must contain exactly the expected article.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const reviewedAt = new Date(`${article.reviewedAt}T00:00:00.000Z`);
const readingMinutes = Math.max(2, Math.ceil(article.body.trim().split(/\s+/).length / 180));
const verifiedBy = "Codefyhub DevOps Department";

try {
  const result = await prisma.$transaction(async (db) => {
    const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new Error("Codefyhub company is missing. Bootstrap the company before publishing this workflow.");

    const section = await db.section.upsert({
      where: { companyId_slug: { companyId, slug: sectionDefinition.slug } },
      update: {
        title: sectionDefinition.title,
        summary: sectionDefinition.summary,
        icon: sectionDefinition.icon,
        status: ContentStatus.PUBLISHED,
      },
      create: { ...sectionDefinition, companyId, status: ContentStatus.PUBLISHED },
    });

    const data = {
      companyId,
      sectionId: section.id,
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      difficulty: Difficulty[article.difficulty],
      contentType: ContentType[article.contentType],
      validationStatus: ValidationStatus[article.validationStatus],
      reviewStatus: ReviewStatus.APPROVED,
      reviewedAt,
      reviewNote: "Approved source-controlled Codefyhub DevOps workflow",
      applicablePlatforms: article.applicablePlatforms,
      applicableVersions: article.applicableVersions,
      prerequisites: article.prerequisites,
      relatedGuides: article.relatedGuides,
      testedAt: article.testedAt ? new Date(`${article.testedAt}T00:00:00.000Z`) : null,
      testEnvironment: article.testEnvironment,
      readingMinutes,
      order: article.order,
      status: ContentStatus.PUBLISHED,
      visibility: ContentVisibility[article.visibility],
      publishedAt: reviewedAt,
      lastVerifiedAt: reviewedAt,
      verifiedBy,
      verificationMethod: "Canonical and Microsoft first-party documentation review; operational execution pending",
      testedVersions: article.applicableVersions.join("; "),
    };

    const existing = await db.article.findUnique({
      where: { sectionId_slug: { sectionId: section.id, slug: article.slug } },
    });
    const contentChanged = !existing
      || existing.body !== article.body
      || existing.title !== article.title
      || existing.description !== article.description;

    const published = existing
      ? await db.article.update({
          where: { id: existing.id },
          data: { ...data, publishedAt: existing.publishedAt ?? reviewedAt },
        })
      : await db.article.create({ data });

    const snapshot = {
      sectionId: section.id,
      slug: article.slug,
      title: article.title,
      description: article.description,
      difficulty: data.difficulty,
      contentType: data.contentType,
      validationStatus: data.validationStatus,
      reviewStatus: data.reviewStatus,
      visibility: data.visibility,
      applicablePlatforms: article.applicablePlatforms,
      applicableVersions: article.applicableVersions,
      prerequisites: article.prerequisites,
      relatedGuides: article.relatedGuides,
      readingMinutes,
      status: data.status,
      publishedAt: (existing?.publishedAt ?? reviewedAt).toISOString(),
      lastVerifiedAt: reviewedAt.toISOString(),
      verifiedBy,
      verificationMethod: data.verificationMethod,
      testedVersions: data.testedVersions,
      sourceTitles: article.sourceTitles,
    };

    let revision = await db.articleVersion.aggregate({
      where: { articleId: published.id },
      _max: { revision: true },
    });
    if (contentChanged) {
      const nextRevision = (revision._max.revision ?? 0) + 1;
      await db.articleVersion.create({
        data: {
          articleId: published.id,
          revision: nextRevision,
          body: article.body,
          changeSummary: existing ? "Updated remote Ubuntu access workflow" : "Initial remote Ubuntu access workflow",
          snapshot,
        },
      });
      revision = { _max: { revision: nextRevision } };
    }

    await db.articleTag.deleteMany({ where: { articleId: published.id } });
    for (const tagSlug of article.tags) {
      const name = tagSlug.split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
      const tag = await db.tag.upsert({
        where: { companyId_slug: { companyId, slug: tagSlug } },
        update: { name },
        create: { companyId, slug: tagSlug, name },
      });
      await db.articleTag.create({ data: { articleId: published.id, tagId: tag.id } });
    }

    await db.articleSource.deleteMany({ where: { articleId: published.id } });
    for (const sourceDefinition of sourceDefinitions) {
      const source = await db.source.upsert({
        where: { companyId_url: { companyId, url: sourceDefinition.url } },
        update: {
          title: sourceDefinition.title,
          organization: sourceDefinition.organization,
          sourceType: sourceDefinition.sourceType,
          lastVerifiedAt: reviewedAt,
          verifiedBy,
        },
        create: {
          ...sourceDefinition,
          companyId,
          accessedAt: reviewedAt,
          lastVerifiedAt: reviewedAt,
          verifiedBy,
        },
      });
      await db.articleSource.create({
        data: {
          articleId: published.id,
          sourceId: source.id,
          claimScope: `${source.title} reviewed for RDP configuration, supported clients, connection behavior, and security boundaries.`,
        },
      });
    }

    if (contentChanged) {
      await db.auditEvent.create({
        data: {
          companyId,
          actorEmail: "source-controlled-content@codefyhub.local",
          action: "PUBLISH_WORKFLOW",
          entityType: "ARTICLE",
          entityId: published.id,
          summary: `Published workflow: ${article.title}`,
          metadata: { section: section.slug, slug: article.slug, revision: revision._max.revision },
        },
      });
    }

    return { articleId: published.id, section: section.slug, slug: published.slug, revision: revision._max.revision };
  });

  console.log(`Published ${result.section}/${result.slug} at revision ${result.revision ?? 0} (${result.articleId}).`);
} finally {
  await prisma.$disconnect();
}
