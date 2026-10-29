import { NextResponse } from "next/server";
import { z } from "zod";
import { ArticleConflictError } from "@/lib/admin/articles";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; revision: string }> };
const payloadSchema = z.object({ expectedUpdatedAt: z.coerce.date(), changeSummary: z.string().trim().min(3).max(240) });

type Snapshot = {
  sectionId?: string; slug?: string;
  title?: string; description?: string; difficulty?: "FOUNDATION" | "INTERMEDIATE" | "ADVANCED";
  contentType?: "CONCEPT" | "HOW_TO" | "RUNBOOK" | "REFERENCE" | "CONFIGURATION_RECIPE" | "LEARNING_PATH" | "FAQ" | "ISSUE_SOLUTION" | "POLICY";
  validationStatus?: "DRAFT" | "SOURCE_REVIEWED" | "LAB_TESTED"; readingMinutes?: number;
  visibility?: "PUBLIC" | "INTERNAL" | "RESTRICTED";
  applicablePlatforms?: string[]; applicableVersions?: string[]; prerequisites?: string[]; relatedGuides?: string[];
  testedAt?: string | null; testEnvironment?: string | null; reviewDueAt?: string | null; expiresAt?: string | null;
  lastVerifiedAt?: string; verifiedBy?: string; verificationMethod?: string; testedVersions?: string;
};

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid restore payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id, revision: revisionParam } = await context.params;
    const revision = Number(revisionParam);
    if (!Number.isInteger(revision) || revision < 1) return NextResponse.json({ error: "Invalid revision." }, { status: 400 });
    const article = await prisma.$transaction(async (tx) => {
      const [current, source] = await Promise.all([
        tx.article.findFirst({ where: { id, companyId: actor.companyId }, include: { versions: { orderBy: { revision: "desc" }, take: 1 }, section: { select: { slug: true } } } }),
        tx.articleVersion.findUnique({ where: { articleId_revision: { articleId: id, revision } } }),
      ]);
      if (!current || !source) return null;
      if (current.updatedAt.getTime() !== parsed.data.expectedUpdatedAt.getTime()) throw new ArticleConflictError();
      const snapshot = (source.snapshot ?? {}) as Snapshot;
      if (snapshot.sectionId && snapshot.sectionId !== current.sectionId) {
        const section = await tx.section.findFirst({ where: { id: snapshot.sectionId, companyId: actor.companyId }, select: { id: true } });
        if (!section) throw new ArticleConflictError("The revision references a section outside this company.");
      }
      const restored = await tx.article.update({
        where: { id },
        data: {
          body: source.body,
          status: "DRAFT",
          publishedAt: null,
          reviewStatus: "DRAFT",
          reviewedAt: null,
          reviewedById: null,
          reviewNote: null,
          ...(snapshot.sectionId ? { sectionId: snapshot.sectionId } : {}),
          ...(snapshot.slug ? { slug: snapshot.slug } : {}),
          ...(snapshot.title ? { title: snapshot.title } : {}),
          ...(snapshot.description ? { description: snapshot.description } : {}),
          ...(snapshot.difficulty ? { difficulty: snapshot.difficulty } : {}),
          ...(snapshot.contentType ? { contentType: snapshot.contentType } : {}),
          ...(snapshot.validationStatus ? { validationStatus: snapshot.validationStatus } : {}),
          ...(snapshot.visibility ? { visibility: snapshot.visibility } : {}),
          ...(snapshot.applicablePlatforms ? { applicablePlatforms: snapshot.applicablePlatforms } : {}),
          ...(snapshot.applicableVersions ? { applicableVersions: snapshot.applicableVersions } : {}),
          ...(snapshot.prerequisites ? { prerequisites: snapshot.prerequisites } : {}),
          ...(snapshot.relatedGuides ? { relatedGuides: snapshot.relatedGuides } : {}),
          ...(snapshot.readingMinutes ? { readingMinutes: snapshot.readingMinutes } : {}),
          ...(snapshot.testedAt !== undefined ? { testedAt: snapshot.testedAt ? new Date(snapshot.testedAt) : null } : {}),
          ...(snapshot.testEnvironment !== undefined ? { testEnvironment: snapshot.testEnvironment } : {}),
          ...(snapshot.reviewDueAt !== undefined ? { reviewDueAt: snapshot.reviewDueAt ? new Date(snapshot.reviewDueAt) : null } : {}),
          ...(snapshot.expiresAt !== undefined ? { expiresAt: snapshot.expiresAt ? new Date(snapshot.expiresAt) : null } : {}),
          ...(snapshot.lastVerifiedAt ? { lastVerifiedAt: new Date(snapshot.lastVerifiedAt) } : {}),
          ...(snapshot.verifiedBy ? { verifiedBy: snapshot.verifiedBy } : {}),
          ...(snapshot.verificationMethod ? { verificationMethod: snapshot.verificationMethod } : {}),
          ...(snapshot.testedVersions ? { testedVersions: snapshot.testedVersions } : {}),
        },
      });
      const nextRevision = (current.versions[0]?.revision ?? 0) + 1;
      await tx.articleVersion.create({
        data: { articleId: id, revision: nextRevision, body: restored.body, changeSummary: parsed.data.changeSummary, snapshot: { ...snapshot, restoredFromRevision: revision }, createdById: actor.id },
      });
      await tx.auditEvent.create({
        data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.restore", entityType: "Article", entityId: id, summary: `Restored ${current.section.slug}/${current.slug} from revision ${revision}`, metadata: { restoredFromRevision: revision, createdRevision: nextRevision } },
      });
      return restored;
    });
    if (!article) return NextResponse.json({ error: "Article or revision not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
