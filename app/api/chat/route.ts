import { NextResponse } from "next/server";
import { z } from "zod";

const ChatRequest = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  model: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured on the server." },
      { status: 500 }
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

  const { messages, model = "llama-3.1-8b-instant" } = parsed.data;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `You are the Codefyhub DevOps Guide assistant. Help users with infrastructure, storage, virtualization, networking, CI/CD, security, and operations questions. Be concise, technical, and safety-conscious. Always remind users to verify commands in a lab before production use. Reference the Codefyhub-DevOps Guide content when relevant.`,
          },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 1000,
        stream: false,
      }),
    });

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
    return NextResponse.json(
      { error: "Internal server error", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
