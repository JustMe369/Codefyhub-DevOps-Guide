import { NextResponse } from "next/server";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";

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
const MAX_MESSAGE_CONTENT_LENGTH = 5000;

// Lenient schema - accepts messages from client, strips system roles server-side
const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]).default("user"),
  content: z.string().max(MAX_MESSAGE_CONTENT_LENGTH).default(""),
});

const ChatRequest = z.object({
  messages: z.array(MessageSchema).max(MAX_MESSAGES).default([]),
  model: z.string().optional(),
  language: z.enum(["auto", "en", "ar"]).default("auto"),
});

export const runtime = "nodejs";

// Load project knowledge base at cold start
let projectKnowledge = "";
try {
  projectKnowledge = readFileSync(join(process.cwd(), "project-knowledge.md"), "utf8");
} catch {
  projectKnowledge = "";
}

/**
 * Detect if text contains Arabic characters
 */
function isArabic(text: string): boolean {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text);
}

/**
 * RAG: Retrieve relevant articles from the database based on user query
 */
async function retrieveRelevantArticles(query: string, limit: number = 3) {
  try {
    // Use Prisma full-text search on title and description
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        section: {
          select: { title: true, slug: true },
        },
      },
      take: limit,
      orderBy: { order: "asc" },
    });

    return articles.map((article) => ({
      title: article.title,
      section: article.section.title,
      slug: article.slug,
      description: article.description,
      difficulty: article.difficulty,
      readingMinutes: article.readingMinutes,
    }));
  } catch {
    // If database is not available, return empty
    return [];
  }
}

/**
 * Build system prompt with RAG context and language awareness
 */
function buildSystemPrompt(
  retrievedArticles: Array<{ title: string; section: string; slug: string; description: string }>,
  language: "en" | "ar"
): string {
  const isArabic = language === "ar";

  const langInstruction = isArabic
    ? "أجب باللغة العربية الفصحى. استخدم المصطلحات التقنية باللغة الإنجليزية بين قوسين عند الحاجة."
    : "Answer in English. Use English for all technical terms and commands.";

  const articlesContext = retrievedArticles.length > 0
    ? `\n\nRELEVANT ARTICLES FROM THE GUIDE:\n${retrievedArticles
        .map(
          (a) => `- ${a.title} (Section: ${a.section}): ${a.description || "No description available."}`
        )
        .join("\n")}`
    : "";

  const safetyRules = isArabic
    ? `- تذكّر دائمًا المستخدم بتجربة الأوامر في مختبر قبل الاستخدام في الإنتاج.
    - لا تُقدم أوامر مدمّرة دون تحذير، وتحقق من الهدف، ومسار الاسترداد، والنتيجة المتوقعة.
    - لا تستخدم بيانات اعتماد حقيقية أو معرّفات إنتاجية أو عناوين URL خاصة في الأمثلة.`
    : `- Always remind users to verify commands in a lab before production use.
    - Never present destructive commands without warning, target-verification step, recovery path, and expected outcome.
    - Never use real credentials, production identifiers, or private URLs in examples.`;

  return `You are the Codefyhub DevOps Guide assistant — an expert AI assistant for the Codefyhub DevOps Guide knowledge system.

PROJECT KNOWLEDGE BASE:
${projectKnowledge}

${articlesContext}

LANGUAGE: ${isArabic ? "Arabic (RTL)" : "English (LTR)"}
${langInstruction}

INSTRUCTIONS:
- Be concise, technical, and safety-conscious
- Reference specific guide sections, articles, and commands when relevant
- If the user asks in Arabic, respond in Arabic with technical terms in English
- If the user asks in English, respond in English
- Auto-detect language from user input and respond in the same language
- ${safetyRules}
- If unsure about a specific technical detail, say so rather than guessing
- Help users choose the right tool, deploy it securely, and validate it works`;
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
    const issues = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { 
        error: "Invalid request format.", 
        issues,
        hint: "Ensure messages is an array of {role, content} objects.",
      },
      { status: 400 }
    );
  }

  const { messages, model, language } = parsed.data;

  // Bound message count (server-side, ignore extras)
  const boundedMessages = messages.slice(-MAX_MESSAGES);

  // Strip system messages from client; server controls the system prompt
  const cleanMessages = boundedMessages.filter((m) => m.role !== "system");

  // Get the last user message for RAG retrieval
  const lastUserMessage = [...boundedMessages].reverse().find((m) => m.role === "user");
  const userQuery = lastUserMessage ? lastUserMessage.content : "";

  // RAG: Retrieve relevant articles from the database
  let retrievedArticles: Array<{ title: string; section: string; slug: string; description: string }> = [];
  if (userQuery && userQuery.length > 3) {
    retrievedArticles = await retrieveRelevantArticles(userQuery, 3);
  }

  // Auto-detect language from user query if set to auto
  let resolvedLanguage: "en" | "ar" = "en";
  if (language === "auto" && userQuery) {
    resolvedLanguage = isArabic(userQuery) ? "ar" : "en";
  } else if (language === "en" || language === "ar") {
    resolvedLanguage = language;
  }

  // Resolve model: use client model if allowed, else fall back through the free model list
  const requestedModel = model ?? "";
  const modelCandidates = FREE_MODELS.includes(requestedModel)
    ? [requestedModel, ...FREE_MODELS.filter((candidate) => candidate !== requestedModel)]
    : FREE_MODELS;

  // Build system prompt with RAG context and language awareness
  const systemPrompt = buildSystemPrompt(retrievedArticles, resolvedLanguage);

  // Try models in order; fall back on 404 (model unavailable) or 429 (rate limited)
  let lastError: string | null = null;
  for (const candidateModel of modelCandidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

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
          max_tokens: 2000,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404 || response.status === 429) {
        const errorText = await response.text();
        lastError = `Model ${candidateModel} unavailable (${response.status}): ${errorText.slice(0, 200)}`;
        continue;
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

      return NextResponse.json({ content, model: candidateModel, language: resolvedLanguage });
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
