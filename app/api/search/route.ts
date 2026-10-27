import { NextResponse } from "next/server";
import { z } from "zod";
import { searchKnowledge } from "@/lib/search";

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
  section: z.string().regex(/^[a-z0-9-]+$/).optional(),
  type: z.enum(["CONCEPT", "HOW_TO", "RUNBOOK", "REFERENCE", "CONFIGURATION_RECIPE", "LEARNING_PATH"]).optional(),
  difficulty: z.enum(["FOUNDATION", "INTERMEDIATE", "ADVANCED"]).optional()
});

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ results: [], error: "Invalid search query." }, { status: 400 });
  const { q, section, type, difficulty } = parsed.data;
  return NextResponse.json({ results: await searchKnowledge(q, { section, contentType: type, difficulty, limit: 8 }) });
}
