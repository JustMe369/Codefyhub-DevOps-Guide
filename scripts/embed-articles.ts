/**
 * scripts/embed-articles.ts
 *
 * Generates vector embeddings for all published articles and stores them in
 * the database for semantic RAG search.
 *
 * Usage: npx tsx scripts/embed-articles.ts
 *
 * Requires: OPENROUTER_API_KEY and DATABASE_URL environment variables.
 */

import { prisma } from "../lib/prisma";

const EMBEDDING_MODEL = "thenlper/gte-small"; // Free, 384-dim, good for semantic search
const BATCH_SIZE = 10;

/**
 * Call OpenRouter embedding API to generate a vector for the given text.
 */
async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("No embedding returned from API.");
  }

  return embedding as number[];
}

/**
 * Build a searchable text representation of an article (title + description + body excerpt).
 */
function articleToText(
  title: string,
  description: string | null,
  body: string
): string {
  const bodyExcerpt = body.slice(0, 2000); // Limit body to first 2000 chars for embedding
  return `${title}\n${description || ""}\n${bodyExcerpt}`;
}

/**
 * Main: fetch all published articles, generate embeddings, upsert into DB.
 */
async function main() {
  console.log("🔍 Fetching published articles...");
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, description: true, body: true },
  });

  console.log(`📚 Found ${articles.length} published articles.`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    console.log(`\n⚡ Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} articles)...`);

    for (const article of batch) {
      try {
        const text = articleToText(article.title, article.description, article.body);
        const embedding = await embedText(text);

        await prisma.article.update({
          where: { id: article.id },
          data: { embedding },
        });

        processed += 1;
        process.stdout.write(".");
      } catch (err) {
        failed += 1;
        console.error(`\n❌ Failed to embed article ${article.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n\n✅ Embedding complete: ${processed} succeeded, ${failed} failed.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Embed script failed:", err);
  process.exit(1);
});
