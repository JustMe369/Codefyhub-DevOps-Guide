import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["OPEN", "PLANNED", "RESOLVED", "DISMISSED"]), resolvedArticleId: z.string().cuid().nullable().optional() });

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.review");
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge-gap update." }, { status: 400 });
    if (parsed.data.status === "RESOLVED" && !parsed.data.resolvedArticleId) {
      return NextResponse.json({ error: "Choose the verified article that resolves this knowledge gap." }, { status: 400 });
    }
    const { id } = await context.params;
    if (parsed.data.resolvedArticleId) {
      const article = await prisma.article.findFirst({ where: { id: parsed.data.resolvedArticleId, companyId: actor.companyId }, select: { id: true } });
      if (!article) return NextResponse.json({ error: "Resolution article not found." }, { status: 404 });
    }
    const existing = await prisma.knowledgeRequest.findFirst({ where: { id, companyId: actor.companyId } });
    if (!existing) return NextResponse.json({ error: "Knowledge request not found." }, { status: 404 });
    const item = await prisma.knowledgeRequest.update({ where: { id }, data: { status: parsed.data.status, resolvedArticleId: parsed.data.resolvedArticleId, resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null } });
    await prisma.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "knowledge.request.update", entityType: "KnowledgeRequest", entityId: id, summary: `Set knowledge gap to ${parsed.data.status}`, metadata: { resolvedArticleId: parsed.data.resolvedArticleId } } });
    return NextResponse.json({ request: item });
  } catch (error) { return adminErrorResponse(error); }
}
