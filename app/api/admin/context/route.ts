import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_COMPANY_COOKIE, listAvailableCompanies, requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";

export const runtime = "nodejs";
const contextSchema = z.object({ companyId: z.string().min(1).max(100) });

export async function GET(request: Request) {
  try {
    const identity = await requireAdminIdentity(request.headers);
    const companies = await listAvailableCompanies(identity);
    return NextResponse.json({ identity, companies });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const identity = await requireAdminIdentity(request.headers);
    const parsed = contextSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid company selection." }, { status: 400 });
    const companies = await listAvailableCompanies(identity);
    if (!companies.some(({ id }) => id === parsed.data.companyId)) {
      return NextResponse.json({ error: "You do not have access to this company." }, { status: 403 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACTIVE_COMPANY_COOKIE, parsed.data.companyId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch (error) {
    return adminErrorResponse(error);
  }
}
