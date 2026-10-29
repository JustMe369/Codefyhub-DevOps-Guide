import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ query: z.string().trim().min(5).max(300), context: z.string().trim().max(1000).optional() });

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.review");
    const requests = await prisma.knowledgeRequest.findMany({ where: { companyId: actor.companyId }, include: { requestedBy: { select: { name: true, email: true } }, resolvedArticle: { select: { id: true, title: true } } }, orderBy: [{ status: "asc" }, { occurrenceCount: "desc" }, { lastRequestedAt: "desc" }] });
    return NextResponse.json({ requests });
  } catch (error) { return adminErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid knowledge request." }, { status: 400 });
    const queryNormalized = parsed.data.query.toLocaleLowerCase("en").replace(/\s+/g, " ");
    const item = await prisma.knowledgeRequest.upsert({
      where: { companyId_queryNormalized: { companyId: actor.companyId, queryNormalized } },
      create: { companyId: actor.companyId, query: parsed.data.query, queryNormalized, context: parsed.data.context || null, requestedById: actor.id },
      update: { occurrenceCount: { increment: 1 }, lastRequestedAt: new Date(), context: parsed.data.context || undefined },
    });
    await prisma.auditEvent.create({ data: { companyId: actor.companyId, actorId: actor.id, actorEmail: actor.email, action: "knowledge.request", entityType: "KnowledgeRequest", entityId: item.id, summary: `Captured knowledge gap: ${parsed.data.query.slice(0, 100)}`, metadata: { occurrenceCount: item.occurrenceCount } } });
    return NextResponse.json({ request: item }, { status: 201 });
  } catch (error) { return adminErrorResponse(error); }
}
