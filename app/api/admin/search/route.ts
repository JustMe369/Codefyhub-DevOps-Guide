import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessRestrictedKnowledge, requireAdminIdentity } from "@/lib/admin/authz";
import { adminErrorResponse } from "@/lib/admin/http";
import { searchCompanyKnowledge } from "@/lib/search";

const schema = z.object({ q: z.string().trim().min(2).max(100) });

export async function GET(request: Request) {
  try {
    const actor = await requireAdminIdentity(request.headers, "content.view");
    const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ results: [], error: "Invalid search query." }, { status: 400 });
    const results = await searchCompanyKnowledge(parsed.data.q, actor.companyId, canAccessRestrictedKnowledge(actor));
    return NextResponse.json({ results });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
