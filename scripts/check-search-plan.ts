import { config } from "dotenv";

config({ path: ".env.local" });
const { prisma } = await import("../lib/prisma");
type Plan = { "Node Type": string; "Index Name"?: string; Plans?: Plan[] };
const indexes = (plan: Plan): string[] => [plan["Index Name"] ?? "", ...(plan.Plans ?? []).flatMap(indexes)].filter(Boolean);

try {
  const results = await prisma.$transaction(async (tx) => {
    const natural = await tx.$queryRaw<Array<{ "QUERY PLAN": Array<{ Plan: Plan; "Execution Time": number }> }>>`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT id FROM "Article"
      WHERE "searchDocument" @@ (websearch_to_tsquery('english', 'mdadm') || websearch_to_tsquery('simple', 'mdadm'))
    `;
    // Small corpora may correctly prefer a sequential scan. Separately prove
    // that the exact production predicate can use the intended GIN index.
    await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
    const eligible = await tx.$queryRaw<Array<{ "QUERY PLAN": Array<{ Plan: Plan }> }>>`
      EXPLAIN (FORMAT JSON) SELECT id FROM "Article"
      WHERE "searchDocument" @@ (websearch_to_tsquery('english', 'mdadm') || websearch_to_tsquery('simple', 'mdadm'))
    `;
    const glossary = await tx.$queryRaw<Array<{ "QUERY PLAN": Array<{ Plan: Plan }> }>>`
      EXPLAIN (FORMAT JSON) SELECT id FROM "GlossaryTerm"
      WHERE "searchDocument" @@ (websearch_to_tsquery('english', 'raid') || websearch_to_tsquery('simple', 'raid'))
    `;
    return { natural: natural[0]["QUERY PLAN"][0], article: indexes(eligible[0]["QUERY PLAN"][0].Plan), glossary: indexes(glossary[0]["QUERY PLAN"][0].Plan) };
  });
  if (!results.article.includes("Article_search_document_idx") || !results.glossary.includes("GlossaryTerm_search_document_idx")) throw new Error("Search predicates cannot use the persisted-document GIN indexes.");
  console.log(JSON.stringify({ naturalPlan: results.natural.Plan["Node Type"], executionMs: results.natural["Execution Time"], eligibleArticleIndexes: results.article, eligibleGlossaryIndexes: results.glossary }));
} finally { await prisma.$disconnect(); }
