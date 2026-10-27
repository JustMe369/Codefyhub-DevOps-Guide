import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const controlPlaneConfigured = Boolean(
      process.env.BETTER_AUTH_SECRET &&
      process.env.GITHUB_CLIENT_ID &&
      process.env.GITHUB_CLIENT_SECRET &&
      process.env.ADMIN_EMAILS,
    );
    return NextResponse.json({
      status: "ok",
      database: "connected",
      controlPlane: controlPlaneConfigured ? "configured" : "setup-required",
    });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable" }, { status: 503 });
  }
}
