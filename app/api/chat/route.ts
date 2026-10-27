import { NextResponse } from "next/server";
import { z } from "zod";

// Server-side allowlist of models. Clients cannot request arbitrary models.
const ALLOWED_MODELS = new Set([
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.1-70b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
]);

// Rate limiting: max requests per window per IP.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }
  entry.count += 1;
  return { allowed: true };
}

// Schema bounds
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CONTENT_LENGTH = 2000;

const ChatRequest = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]), // system is not allowed from client
      content: z.string().min(1).max(MAX_MESSAGE_CONTENT_LENGTH),
    })
  ),
  model: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // Rate limiting by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rate.retryAfterMs ?? 0) / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ChatRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request format.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { messages, model } = parsed.data;

  // Bound message count (server-side, ignore extras)
  const boundedMessages = messages.slice(-MAX_MESSAGES);

  // Schema already rejects system messages; server controls the system prompt
  const cleanMessages = boundedMessages;

  // Resolve model: use default if client requests a disallowed model
  const resolvedModel = ALLOWED_MODELS.has(model ?? "") ? model : "meta-llama/llama-3.1-8b-instruct:free";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25_000); // 25s upstream timeout

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://codefyhub-dev-ops-guide.vercel.app",
        "X-Title": "Codefyhub-DevOps Guide AI Assistant",
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: [
          {
            role: "system",
            content: `You are the Codefyhub DevOps Guide assistant. Help users with infrastructure, storage, virtualization, networking, CI/CD, security, and operations questions. Be concise, technical, and safety-conscious. Always remind users to verify commands in a lab before production use. Reference the Codefyhub-DevOps Guide content when relevant.`,
          },
          ...cleanMessages,
        ],
        temperature: 0.3,
        max_tokens: 1000,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `LLM API error: ${response.status}`, detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "No response from LLM." }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out. Try again." }, { status: 504 });
    }
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
