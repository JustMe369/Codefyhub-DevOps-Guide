import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  isPublic: z.boolean(),
});

async function requirePlatformAdmin(headers: Headers) {
  const actor = await requireAdminIdentity(headers);
  return actor.isPlatformAdmin ? actor : null;
}

export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await requirePlatformAdmin(request.headers);
    if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid company payload.", issues: parsed.error.flatten() }, { status: 400 });
    const { id } = await context.params;
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    if (existing.status === "ACTIVE" && parsed.data.status !== "ACTIVE") {
      const otherActive = await prisma.company.count({ where: { id: { not: id }, status: "ACTIVE" } });
      if (otherActive === 0) return NextResponse.json({ error: "The final active company cannot be suspended or archived." }, { status: 409 });
    }
    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({ where: { id }, data: parsed.data });
      await tx.auditEvent.create({
        data: { companyId: id, actorId: actor.id, actorEmail: actor.email, action: "company.update", entityType: "Company", entityId: id, summary: `Updated company ${updated.name}`, metadata: { before: { name: existing.name, slug: existing.slug, status: existing.status, isPublic: existing.isPublic }, after: parsed.data } },
      });
      return updated;
    });
    return NextResponse.json({ company });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await requirePlatformAdmin(request.headers);
    if (!actor) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const parsed = z.object({ confirmSlug: z.string(), permanent: z.literal(true) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Permanent deletion requires explicit confirmation." }, { status: 400 });
    const { id } = await context.params;
    const company = await prisma.company.findUnique({ where: { id }, include: { _count: { select: { memberships: true, articles: true, sections: true } } } });
    if (!company) return NextResponse.json({ error: "Company not found." }, { status: 404 });
    if (parsed.data.confirmSlug !== company.slug) return NextResponse.json({ error: "The confirmation slug does not match." }, { status: 400 });
    const otherCompany = await prisma.company.findFirst({ where: { id: { not: id }, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    if (!otherCompany) return NextResponse.json({ error: "The final active company cannot be deleted." }, { status: 409 });
    await prisma.$transaction(async (tx) => {
      await tx.auditEvent.create({
        data: { companyId: otherCompany.id, actorId: actor.id, actorEmail: actor.email, action: "company.delete", entityType: "Company", entityId: id, summary: `Permanently deleted company ${company.name}`, metadata: { slug: company.slug, counts: company._count } },
      });
      await tx.company.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
