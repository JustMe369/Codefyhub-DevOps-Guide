import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWorkflowPdf } from "@/lib/portal/workflow-pdf";
import { getPortalIdentity, portalArticleWhere } from "@/lib/portal/knowledge";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getPortalIdentity(request.headers);
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findFirst({
    where: { ...portalArticleWhere(identity), id, contentType: "WORKFLOW" },
    include: { section: true, articleSources: { include: { source: true } } },
  });
  if (!article) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });

  const pdf = await createWorkflowPdf({
    title: article.title,
    description: article.description,
    body: article.body,
    sectionTitle: article.section.title,
    verifiedBy: article.verifiedBy,
    verificationMethod: article.verificationMethod,
    lastVerifiedAt: article.lastVerifiedAt,
    sources: article.articleSources.map(({ source, claimScope }) => ({ organization: source.organization, title: source.title, url: source.url, claimScope })),
  });
  const filename = `${article.slug.slice(0, 90)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
