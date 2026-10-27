import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const hasKey = Boolean(process.env.OPENROUTER_API_KEY);
  return NextResponse.json({
    configured: hasKey,
    provider: "openrouter",
    model: "meta-llama/llama-3.1-8b-instruct:free",
    message: hasKey
      ? "AI assistant is configured and ready."
      : "OPENROUTER_API_KEY is not set. Add it in Vercel project Settings → Environment Variables, then redeploy.",
  });
}
