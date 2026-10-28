import { NextResponse } from "next/server";
import { z } from "zod";
import { provisionCompanyAccess } from "@/lib/admin/companies";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  isPublic: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const companies = await prisma.company.findMany({
      include: { _count: { select: { memberships: true, articles: true, sections: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = companySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid company payload.", issues: parsed.error.flatten() }, { status: 400 });
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({ data: parsed.data });
      await provisionCompanyAccess(tx, created.id);
      await tx.auditEvent.create({
        data: {
          companyId: created.id,
          actorId: actor.id,
          actorEmail: actor.email,
          action: "company.create",
          entityType: "Company",
          entityId: created.id,
          summary: `Created company ${created.name}`,
        },
      });
      return created;
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
