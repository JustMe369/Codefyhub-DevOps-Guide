import { prisma } from "@/lib/prisma";

export const EMBEDDING_MODEL = "thenlper/gte-small";

function searchableArticleText(title: string, description: string, body: string) {
  return `${title}\n${description}\n${body}`.slice(0, 8_000);
}

async function createEmbedding(text: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Embedding provider returned HTTP ${response.status}.`);
  const payload = await response.json() as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding || embedding.length !== 384) throw new Error("The embedding provider returned an invalid vector.");
  return embedding;
}

export async function reindexArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, description: true, body: true, status: true, versions: { orderBy: { revision: "desc" }, take: 1, select: { revision: true } } },
  });
  if (!article || article.status !== "PUBLISHED") return false;
  const embedding = await createEmbedding(searchableArticleText(article.title, article.description, article.body));
  const vector = `[${embedding.join(",")}]`;
  const revision = article.versions[0]?.revision ?? 1;
  await prisma.$executeRaw`UPDATE "Article" SET "embedding" = ${vector}::vector, "embeddingRevision" = ${revision}, "embeddingModel" = ${EMBEDDING_MODEL} WHERE "id" = ${article.id}`;
  return true;
}
