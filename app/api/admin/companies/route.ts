import { NextResponse } from "next/server";
import { z } from "zod";
import { provisionCompanyAccess } from "@/lib/admin/companies";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { InvalidCompanyLogoError, parseCompanyLogoDataUrl } from "@/lib/admin/company-logo";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  isPublic: z.boolean().default(false),
  logoDataUrl: z.string().max(720_000).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const url = new URL(request.url);
    const page = z.coerce.number().min(1).default(1).parse(url.searchParams.get("page") ?? undefined);
    const limit = z.coerce.number().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? undefined);
    const skip = (page - 1) * limit;

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        select: { id: true, name: true, slug: true, status: true, isPublic: true, logoMimeType: true, _count: { select: { memberships: true, articles: true, sections: true } } },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.company.count(),
    ]);
    return NextResponse.json({ companies, page, limit, total, totalPages: Math.ceil(total / limit) });
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
    const { logoDataUrl, ...companyData } = parsed.data;
    let logoData: Uint8Array<ArrayBuffer> | null = null;
    let logoMimeType: string | null = null;
    try {
      if (logoDataUrl) ({ data: logoData, mimeType: logoMimeType } = parseCompanyLogoDataUrl(logoDataUrl));
    } catch (error) {
      if (error instanceof InvalidCompanyLogoError) return NextResponse.json({ error: error.message }, { status: 400 });
      throw error;
    }
    const company = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({ data: { ...companyData, logoData, logoMimeType }, select: { id: true, name: true, slug: true, status: true, isPublic: true, logoMimeType: true } });
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
