import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const payloadSchema = z.object({
  action: z.enum(["submit", "approve", "request_changes"]),
  note: z.string().trim().max(1000).default(""),
  expectedUpdatedAt: z.coerce.date(),
});

export async function POST(request: Request, context: Context) {
  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid review action." }, { status: 400 });
    const permission = parsed.data.action === "submit" ? "content.edit" : "content.review";
    const actor = await requireAdminIdentity(request.headers, permission);
    const { id } = await context.params;
    const article = await prisma.$transaction(async (tx) => {
      const current = await tx.article.findFirst({ where: { id, companyId: actor.companyId }, include: { articleSources: { select: { sourceId: true } }, section: { select: { slug: true } } } });
      if (!current) return null;
      if (current.updatedAt.getTime() !== parsed.data.expectedUpdatedAt.getTime()) throw new Error("The article changed since this review action was prepared. Refresh and try again.");
      if (parsed.data.action === "submit") {
        if (current.status !== "DRAFT") throw new Error("Only draft articles can be submitted for review.");
        if (current.reviewStatus === "IN_REVIEW" || current.reviewStatus === "APPROVED") throw new Error("This article is already in review or approved.");
        if (current.validationStatus === "DRAFT" || current.articleSources.length === 0) throw new Error("Source review and at least one evidence source are required before review.");
        const result = await tx.article.updateMany({ where: { id, companyId: actor.companyId, status: "DRAFT", reviewStatus: current.reviewStatus, updatedAt: parsed.data.expectedUpdatedAt }, data: { reviewStatus: "IN_REVIEW", reviewDueAt: current.reviewDueAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), reviewedAt: null, reviewedById: null, reviewNote: null } });
        if (!result.count) throw new Error("The article changed during this review action. Refresh and try again.");
        const updated = await tx.article.findUniqueOrThrow({ where: { id } });
        await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "article.review.submit", entityType: "Article", entityId: id, summary: `Submitted ${current.section.slug}/${current.slug} for review` } });
        return updated;
      }
      if (current.status !== "DRAFT" || current.reviewStatus !== "IN_REVIEW") throw new Error("Only draft knowledge currently in review can receive a decision.");
      const approved = parsed.data.action === "approve";
      const result = await tx.article.updateMany({ where: { id, companyId: actor.companyId, status: "DRAFT", reviewStatus: "IN_REVIEW", updatedAt: parsed.data.expectedUpdatedAt }, data: { reviewStatus: approved ? "APPROVED" : "CHANGES_REQUESTED", reviewedAt: new Date(), reviewedById: actor.id, reviewNote: parsed.data.note || null } });
      if (!result.count) throw new Error("The article changed during this review decision. Refresh and try again.");
      const updated = await tx.article.findUniqueOrThrow({ where: { id } });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: approved ? "article.review.approve" : "article.review.request_changes", entityType: "Article", entityId: id, summary: `${approved ? "Approved" : "Requested changes for"} ${current.section.slug}/${current.slug}`, metadata: { note: parsed.data.note } } });
      return updated;
    });
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith("Source review") || error.message.startsWith("Only ") || error.message.startsWith("The article changed"))) return NextResponse.json({ error: error.message }, { status: 409 });
    return adminErrorResponse(error);
  }
}
