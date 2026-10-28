import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const [articles, sections, sources, users, recentAudit] = await Promise.all([
      prisma.article.groupBy({ by: ["status"], where: { companyId: actor.companyId }, _count: { _all: true } }),
      prisma.section.count({ where: { companyId: actor.companyId } }),
      prisma.source.count({ where: { companyId: actor.companyId } }),
      prisma.membership.count({ where: { companyId: actor.companyId, status: "ACTIVE" } }),
      prisma.auditEvent.findMany({ where: { companyId: actor.companyId }, orderBy: { createdAt: "desc" }, take: 12 }),
    ]);
    return NextResponse.json({ articles, sections, sources, users, recentAudit });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
