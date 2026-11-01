import { lockCompany } from "@/lib/admin/locking";
import { ArticleConflictError } from "@/lib/admin/articles";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ title: z.string().trim().min(3).max(240), organization: z.string().trim().min(2).max(160), url: z.url().max(2_000), sourceType: z.string().trim().min(2).max(80), lastVerifiedAt: z.coerce.date(), verifiedBy: z.string().trim().min(2).max(120) });

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "sources.manage");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid source payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const existing = await prisma.source.findFirst({ where: { id, companyId: actor.companyId } });
    if (!existing) return NextResponse.json({ error: "Source not found." }, { status: 404 });
    const source = await prisma.$transaction(async (tx) => {
      await lockCompany(tx, actor.companyId);
      const governed = await tx.articleSource.count({ where: { sourceId: id, article: { OR: [{ status: "PUBLISHED" }, { reviewStatus: { in: ["APPROVED", "IN_REVIEW"] } }] } } });
      if (governed) throw new ArticleConflictError("Save draft revisions of all reviewed articles before changing their evidence source.");
      const updated = await tx.source.update({ where: { id }, data: parsed.data });
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "source.update", entityType: "Source", entityId: id, summary: `Updated source ${updated.title}` } });
      return updated;
    });
    return NextResponse.json({ source });
  } catch (error) { if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 }); return adminErrorResponse(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "sources.manage");
    const { id } = await context.params;
    const source = await prisma.source.findFirst({ where: { id, companyId: actor.companyId }, include: { _count: { select: { articleSources: true } } } });
    if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await lockCompany(tx, actor.companyId);
      if (await tx.articleSource.count({ where: { sourceId: id } })) throw new ArticleConflictError("Detach this source from all articles before deleting it.");
      await tx.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "source.delete", entityType: "Source", entityId: id, summary: `Deleted source ${source.title}`, metadata: { detachedArticles: source._count.articleSources } } });
      await tx.source.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) { if (error instanceof ArticleConflictError) return NextResponse.json({ error: error.message }, { status: 409 }); return adminErrorResponse(error); }
}
