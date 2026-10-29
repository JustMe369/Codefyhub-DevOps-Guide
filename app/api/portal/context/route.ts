import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_COMPANY_COOKIE, listAvailableCompanies } from "@/lib/admin/authz";
import { getPortalIdentity } from "@/lib/portal/knowledge";
import { isTrustedMutationOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const contextSchema = z.object({ companyId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "The request origin is not trusted." }, { status: 403 });
  const identity = await getPortalIdentity(request.headers);
  if (!identity) return NextResponse.json({ error: "Company authentication is required." }, { status: 401 });
  const parsed = contextSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid company selection." }, { status: 400 });
  const companies = await listAvailableCompanies(identity);
  if (!companies.some(({ id }) => id === parsed.data.companyId)) return NextResponse.json({ error: "You do not have access to this company." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACTIVE_COMPANY_COOKIE, parsed.data.companyId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
