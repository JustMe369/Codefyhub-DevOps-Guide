import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { headerMenuSchema } from "@/lib/site-navigation";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "structure.manage");
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = headerMenuSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid header menu.", issues: parsed.error.flatten() }, { status: 400 });

    const configuration = await prisma.$transaction(async (tx) => {
      const saved = await tx.siteConfiguration.upsert({
        where: { id: "global" },
        create: { id: "global", headerMenu: parsed.data },
        update: { headerMenu: parsed.data },
      });
      await tx.auditEvent.create({
        data: {
          companyId: actor.companyId,
          actorId: actor.id,
          actorEmail: actor.email,
          action: "navigation.update",
          entityType: "SiteConfiguration",
          entityId: saved.id,
          summary: `Updated the public header menu (${parsed.data.filter((item) => item.visible).length} visible items)`,
          metadata: { itemCount: parsed.data.length, visibleItemCount: parsed.data.filter((item) => item.visible).length },
        },
      });
      return saved;
    });

    revalidatePath("/", "layout");
    revalidateTag("site-navigation", "max");
    return NextResponse.json({ configuration });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
