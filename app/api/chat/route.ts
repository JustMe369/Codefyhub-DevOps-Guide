import { NextResponse } from "next/server";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// Ordered list of free models to try. If one returns 404 (unavailable), fall back to the next.
const FREE_MODELS = [
  "openrouter/free", // auto-router — always picks an available free model
  "meta-llama/llama-3.1-8b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "google/gemma-2-9b-it:free",
];

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
const MAX_MESSAGES = 30;
const MAX_MESSAGE_CONTENT_LENGTH = 3000;

const ChatRequest = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(MAX_MESSAGE_CONTENT_LENGTH),
    })
  ),
  model: z.string().optional(),
});

export const runtime = "nodejs";

// Load project knowledge base at cold start
let projectKnowledge = "";
try {
  // This runs at build/deploy time; the file is bundled into the deployment
  projectKnowledge = readFileSync(join(process.cwd(), "project-knowledge.md"), "utf8");
} catch {
  projectKnowledge = "";
}

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

  // Resolve model: use client model if allowed, else fall back through the free model list
  const requestedModel = model ?? "";
  const modelCandidates = FREE_MODELS.includes(requestedModel)
    ? [requestedModel, ...FREE_MODELS.filter((candidate) => candidate !== requestedModel)]
    : FREE_MODELS;

  // Build system prompt with project knowledge base
  const systemPrompt = `You are the Codefyhub DevOps Guide assistant — an expert AI assistant for the Codefyhub DevOps Guide knowledge system.

PROJECT KNOWLEDGE BASE:
${projectKnowledge}

INSTRUCTIONS:
- Be concise, technical, and safety-conscious
- Reference specific guide sections, articles, and commands when relevant
- Always remind users to verify commands in a lab before production use
- Never present destructive commands without warning, target-verification step, recovery path, and expected outcome
- Never use real credentials, production identifiers, or private URLs in examples
- If asked about project internals (structure, stack, commands, sections), reference the knowledge base above
- If unsure about a specific technical detail, say so rather than guessing
- Help users choose the right tool, deploy it securely, and validate it works`;

  // Try models in order; fall back on 404 (model unavailable) or 429 (rate limited)
  let lastError: string | null = null;
  for (const candidateModel of modelCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s upstream timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://codefyhub-dev-ops-guide.vercel.app",
          "X-Title": "Codefyhub-DevOps Guide AI Assistant",
        },
        body: JSON.stringify({
          model: candidateModel,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...cleanMessages,
          ],
          temperature: 0.3,
          max_tokens: 1500,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404 || response.status === 429) {
        const errorText = await response.text();
        lastError = `Model ${candidateModel} unavailable (${response.status}): ${errorText.slice(0, 200)}`;
        continue; // try next model
      }

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

      return NextResponse.json({ content, model: candidateModel });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = `Request to ${candidateModel} timed out`;
        continue;
      }
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(
    { error: "All available models failed. Last error: " + lastError },
    { status: 502 }
  );
}
