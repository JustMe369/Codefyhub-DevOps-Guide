import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdminIdentity(request.headers);
    const params = new URL(request.url).searchParams;
    const cursor = params.get("cursor") || undefined;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
    const events = await prisma.auditEvent.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    return NextResponse.json({ items, nextCursor: hasMore ? items.at(-1)?.id : null });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
