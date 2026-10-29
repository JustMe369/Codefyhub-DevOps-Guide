import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const now = new Date();
    const staleBefore = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const expiresSoon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [articles, sections, sources, users, reviewQueue, staleCount, expiringCount, recentAudit] = await Promise.all([
      prisma.article.groupBy({ by: ["status"], where: { companyId: actor.companyId }, _count: { _all: true } }),
      prisma.section.count({ where: { companyId: actor.companyId } }),
      prisma.source.count({ where: { companyId: actor.companyId } }),
      prisma.membership.count({ where: { companyId: actor.companyId, status: "ACTIVE" } }),
      prisma.article.count({ where: { companyId: actor.companyId, reviewStatus: "IN_REVIEW" } }),
      prisma.article.count({ where: { companyId: actor.companyId, status: "PUBLISHED", lastVerifiedAt: { lt: staleBefore } } }),
      prisma.article.count({ where: { companyId: actor.companyId, status: "PUBLISHED", expiresAt: { gt: now, lte: expiresSoon } } }),
      prisma.auditEvent.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: "desc" }, take: 12 }),
    ]);
    return NextResponse.json({ articles, sections, sources, users, reviewQueue, staleCount, expiringCount, recentAudit });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
