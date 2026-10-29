import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers);
    if (!actor.isPlatformAdmin) return NextResponse.json({ error: "Platform administrator access is required." }, { status: 403 });
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, emailVerified: true, role: true, banned: true, banReason: true, createdAt: true,
        memberships: { select: { id: true, status: true, company: { select: { id: true, name: true } }, role: { select: { name: true } } }, orderBy: { company: { name: "asc" } } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ users });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
