import { NextResponse } from "next/server";
import { AdminAuthorizationError } from "@/lib/admin/authz";

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  console.error("Admin API failure", error);
  return NextResponse.json({ error: "The control-plane request failed." }, { status: 500 });
}
