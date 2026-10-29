import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.edit");
    const { id } = await context.params;
    const article = await prisma.$transaction(async (tx) => {
      const current = await tx.article.findFirst({
        where: { id, companyId: actor.companyId },
        include: { section: { select: { slug: true } } },
      });
      if (!current) return null;
      if (current.status !== "ARCHIVED") throw new Error("Only archived articles can be restored.");
      const restored = await tx.article.update({
        where: { id },
        data: {
          status: "DRAFT",
          publishedAt: null,
          reviewStatus: "DRAFT",
          reviewedAt: null,
          reviewedById: null,
          reviewNote: null,
        },
      });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.id,
          actorEmail: actor.email,
          action: "article.restore",
          entityType: "Article",
          entityId: id,
          summary: `Restored ${current.section.slug}/${restored.slug} from archived state`,
        },
      });
      return restored;
    });
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    if (error instanceof Error && error.message === "Only archived articles can be restored.") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return adminErrorResponse(error);
  }
}
