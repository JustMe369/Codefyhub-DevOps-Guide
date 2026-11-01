import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const providerConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  let limiterReady = process.env.NODE_ENV !== "production" && !url && !token;
  if (url && token) {
    try {
      const ping = new Redis({ url, token }).ping();
      limiterReady = await Promise.race([ping.then(() => true), new Promise<false>((resolve) => { const timer = setTimeout(() => resolve(false), 2_000); timer.unref?.(); })]);
    } catch { limiterReady = false; }
  }
  const ready = providerConfigured && limiterReady;
  return NextResponse.json({
    configured: ready,
    status: ready ? "ready" : "unavailable",
    provider: "openrouter",
    dependencies: { providerConfigured, limiterReady },
    message: ready ? "AI assistant dependencies are ready." : "AI assistant dependencies require configuration or recovery.",
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
