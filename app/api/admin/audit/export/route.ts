import { NextResponse } from "next/server";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "audit.view");
    const params = new URL(request.url).searchParams;
    const from = params.get("from") ? new Date(params.get("from")!) : undefined;
    const to = params.get("to") ? new Date(params.get("to")!) : undefined;
    const limit = Math.min(10000, Math.max(1, Number(params.get("limit")) || 1000));

    const where: Record<string, unknown> = { companyId: actor.companyId };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = from;
      if (to) (where.createdAt as Record<string, unknown>).lte = to;
    }

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    const headers = ["id", "actorEmail", "action", "entityType", "entityId", "summary", "createdAt"];
    const rows = events.map((event) => [
      event.id,
      event.actorEmail,
      event.action,
      event.entityType,
      event.entityId ?? "",
      event.summary,
      event.createdAt.toISOString(),
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-export-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
