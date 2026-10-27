import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminIdentity(request.headers);
    const [articles, sections, sources, users, recentAudit] = await Promise.all([
      prisma.article.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.section.count(),
      prisma.source.count(),
      prisma.user.count(),
      prisma.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    ]);
    return NextResponse.json({ articles, sections, sources, users, recentAudit });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
