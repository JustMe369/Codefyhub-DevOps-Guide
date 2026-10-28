import { NextResponse } from "next/server";

export function GET(request: Request) {
  return NextResponse.redirect(new URL("/brand/Codefyhub-DevOps-g.jpg", request.url), 307);
}
