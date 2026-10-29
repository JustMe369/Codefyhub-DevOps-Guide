import { NextRequest, NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { rateLimit } from "@/lib/rate-limit";

const ADMIN_RATE_LIMIT = 60;
const ADMIN_RATE_WINDOW_MS = 60_000;

function getRateLimitKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return `random:${crypto.randomUUID()}`;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/admin/")) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      if (!isTrustedMutationOrigin(request)) {
        return NextResponse.json({ error: "The request origin is not trusted." }, { status: 403 });
      }
    }

    const isOverviewRead = pathname === "/api/admin/overview" && request.method === "GET";
    if (!isOverviewRead) {
      const { ok, retryAfterMs } = rateLimit(getRateLimitKey(request), ADMIN_RATE_LIMIT, ADMIN_RATE_WINDOW_MS);
      if (!ok) {
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
        return NextResponse.json(
          { error: "Too many requests. Please try again later.", retryAfter: retryAfterSeconds },
          { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
        );
      }
    }
  }

  if (pathname.startsWith("/api/")) return NextResponse.next();

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const isHttps = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev && isHttps ? ["upgrade-insecure-requests"] : [])
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }]
};
