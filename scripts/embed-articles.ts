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
import { reindexArticle } from "../lib/search-embeddings";

const BATCH_SIZE = 10;

/**
 * Main: fetch all published articles, generate embeddings, upsert into DB.
 */
async function main() {
  console.log("🔍 Fetching published articles...");
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true },
  });

  console.log(`📚 Found ${articles.length} published articles.`);

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    console.log(`\n⚡ Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} articles)...`);

    for (const article of batch) {
      try {
        await reindexArticle(article.id);

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
