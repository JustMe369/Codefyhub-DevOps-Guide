import { headers } from "next/headers";
import { KnowledgeGapManager } from "@/components/admin/knowledge-gap-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function KnowledgeGapsPage() {
  const actor = await requireAdminIdentity(await headers(), "content.review");
  const [requests, articles] = await Promise.all([
    prisma.knowledgeRequest.findMany({ where: { companyId: actor.companyId }, include: { requestedBy: { select: { name: true, email: true } }, resolvedArticle: { select: { id: true, title: true } } }, orderBy: [{ status: "asc" }, { occurrenceCount: "desc" }, { lastRequestedAt: "desc" }] }),
    prisma.article.findMany({ where: { companyId: actor.companyId, status: "PUBLISHED", reviewStatus: "APPROVED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Demand-driven knowledge</div><h1>Knowledge gaps</h1><p>Turn repeated unanswered questions into planned, reviewed company knowledge.</p></div></header><KnowledgeGapManager initialRequests={requests} articles={articles} /></main>;
}
