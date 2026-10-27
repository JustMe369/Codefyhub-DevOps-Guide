import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { AdminAuthorizationError } from "@/lib/admin/authz";

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A record with the same unique value already exists." }, { status: 409 });
    }
    if (error.code === "P2003") {
      return NextResponse.json({ error: "The request references a record that does not exist." }, { status: 409 });
    }
  }

  console.error("Admin API failure", error);
  return NextResponse.json({ error: "The control-plane request failed." }, { status: 500 });
}
