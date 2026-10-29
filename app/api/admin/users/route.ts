import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const url = new URL(request.url);
    const page = z.coerce.number().min(1).default(1).parse(url.searchParams.get("page") ?? undefined);
    const limit = z.coerce.number().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? undefined);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, name: true, email: true, emailVerified: true, role: true, banned: true, banReason: true, createdAt: true,
          memberships: { select: { id: true, status: true, company: { select: { id: true, name: true } }, role: { select: { name: true } } }, orderBy: { company: { name: "asc" } } },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);
    return NextResponse.json({ users, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
