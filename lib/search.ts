import { publicCompanyId } from "@/lib/public-company";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SearchFilters = { section?: string; contentType?: string; difficulty?: string; limit?: number };
export type SearchResult = {
  id: string; title: string; description: string; articleSlug: string; sectionSlug: string; sectionTitle: string;
  rank: number; kind: "article" | "glossary"; snippet: string; contentType: string; difficulty: string;
};

export async function searchKnowledge(query: string, filters: SearchFilters = {}) {
  if (query.trim().length < 2) return [];
  const section = filters.section || null;
  const contentType = filters.contentType || null;
  const difficulty = filters.difficulty || null;
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 30);

  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    WITH search_query AS (
      SELECT websearch_to_tsquery('english', ${query}) || websearch_to_tsquery('simple', ${query}) AS value
    ), article_documents AS (
      SELECT a.*, s.slug AS "sectionSlug", s.title AS "sectionTitle",
        a."searchDocument" AS document
      FROM "Article" a
      JOIN "Section" s ON s.id = a."sectionId"
      JOIN "Company" c ON c.id = a."companyId"
      WHERE a.status = 'PUBLISHED' AND a."reviewStatus" = 'APPROVED' AND a.visibility = 'PUBLIC' AND a."contentType" <> 'WORKFLOW' AND (a."expiresAt" IS NULL OR a."expiresAt" > CURRENT_TIMESTAMP) AND s.status = 'PUBLISHED' AND c."isPublic" = true AND c.status = 'ACTIVE' AND c.id = ${publicCompanyId()}
    )
    SELECT * FROM (
      SELECT a.id, a.title, a.description, a.slug AS "articleSlug", a."sectionSlug", a."sectionTitle",
        ts_rank_cd(a.document, q.value) AS rank, 'article'::text AS kind,
        replace(replace(ts_headline('simple', a.body, q.value, 'MaxFragments=2, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', '') AS snippet,
        a."contentType"::text AS "contentType", a.difficulty::text AS difficulty
      FROM article_documents a CROSS JOIN search_query q
      WHERE a.document @@ q.value
        AND (CAST(${section} AS text) IS NULL OR a."sectionSlug" = CAST(${section} AS text))
        AND (CAST(${contentType} AS text) IS NULL OR a."contentType"::text = CAST(${contentType} AS text))
        AND (CAST(${difficulty} AS text) IS NULL OR a.difficulty::text = CAST(${difficulty} AS text))
      UNION ALL
      SELECT g.id, g.term, g.definition, '', '', 'Glossary',
        ts_rank_cd(g."searchDocument", q.value),
        'glossary'::text,
        replace(replace(ts_headline('simple', g.definition, q.value, 'MaxFragments=1, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', ''),
        'REFERENCE'::text, 'FOUNDATION'::text
      FROM "GlossaryTerm" g JOIN "Company" c ON c.id = g."companyId" CROSS JOIN search_query q
      WHERE (g."searchDocument") @@ q.value
        AND c."isPublic" = true AND c.status = 'ACTIVE' AND c.id = ${publicCompanyId()}
        AND CAST(${section} AS text) IS NULL AND CAST(${contentType} AS text) IS NULL AND CAST(${difficulty} AS text) IS NULL
    ) results ORDER BY rank DESC, title ASC LIMIT ${limit}
  `);
}

export async function searchCompanyKnowledge(query: string, companyId: string, includeRestricted: boolean, limit = 30) {
  if (query.trim().length < 2) return [];
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    WITH search_query AS (
      SELECT websearch_to_tsquery('english', ${query}) || websearch_to_tsquery('simple', ${query}) AS value
    ), article_documents AS (
      SELECT a.*, s.slug AS "sectionSlug", s.title AS "sectionTitle",
        a."searchDocument" AS document
      FROM "Article" a
      JOIN "Section" s ON s.id = a."sectionId"
      WHERE a."companyId" = ${companyId}
        AND a.status = 'PUBLISHED'
        AND a."reviewStatus" = 'APPROVED'
        AND s.status = 'PUBLISHED'
        AND (a."expiresAt" IS NULL OR a."expiresAt" > CURRENT_TIMESTAMP)
        AND a.visibility <> 'DRAFT'
        AND (${includeRestricted} OR a.visibility <> 'RESTRICTED')
    )
    SELECT * FROM (
      SELECT a.id, a.title, a.description, a.slug AS "articleSlug", a."sectionSlug", a."sectionTitle",
        ts_rank_cd(a.document, q.value) AS rank, 'article'::text AS kind,
        replace(replace(ts_headline('simple', a.body, q.value, 'MaxFragments=2, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', '') AS snippet,
        a."contentType"::text AS "contentType", a.difficulty::text AS difficulty
      FROM article_documents a CROSS JOIN search_query q WHERE a.document @@ q.value
      UNION ALL
      SELECT g.id, g.term, g.definition, '', '', 'Glossary',
        ts_rank_cd(g."searchDocument", q.value),
        'glossary'::text,
        replace(replace(ts_headline('simple', g.definition, q.value, 'MaxFragments=1, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', ''),
        'REFERENCE'::text, 'FOUNDATION'::text
      FROM "GlossaryTerm" g CROSS JOIN search_query q
      WHERE g."companyId" = ${companyId}
        AND (g."searchDocument") @@ q.value
    ) results ORDER BY rank DESC, title ASC LIMIT ${boundedLimit}
  `);
}
