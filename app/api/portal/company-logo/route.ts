import { NextResponse } from "next/server";
import { getPortalIdentity } from "@/lib/portal/knowledge";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const identity = await getPortalIdentity(request.headers);
  if (!identity) return NextResponse.json({ error: "Company membership is required." }, { status: 401 });

  const requestedCompanyId = new URL(request.url).searchParams.get("companyId");
  if (requestedCompanyId !== identity.companyId) return NextResponse.json({ error: "Company logo is not available in this workspace." }, { status: 403 });

  const company = await prisma.company.findUnique({ where: { id: identity.companyId }, select: { logoData: true, logoMimeType: true } });
  if (!company?.logoData || !company.logoMimeType) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });

  return new NextResponse(company.logoData, { headers: { "Content-Type": company.logoMimeType, "Content-Length": String(company.logoData.byteLength), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
}
