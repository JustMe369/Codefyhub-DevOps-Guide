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
    WITH article_documents AS (
      SELECT a.*, s.slug AS "sectionSlug", s.title AS "sectionTitle",
        setweight(to_tsvector('english', a.title), 'A') ||
        setweight(to_tsvector('english', a.description), 'B') ||
        setweight(to_tsvector('english', a.body), 'C') ||
        setweight(to_tsvector('english', coalesce((SELECT string_agg(t.name, ' ') FROM "ArticleTag" at JOIN "Tag" t ON t.id = at."tagId" WHERE at."articleId" = a.id), '')), 'B') AS document
      FROM "Article" a
      JOIN "Section" s ON s.id = a."sectionId"
      JOIN "Company" c ON c.id = a."companyId"
      WHERE a.status = 'PUBLISHED' AND a."reviewStatus" = 'APPROVED' AND a.visibility = 'PUBLIC' AND a."contentType" <> 'WORKFLOW' AND (a."expiresAt" IS NULL OR a."expiresAt" > CURRENT_TIMESTAMP) AND s.status = 'PUBLISHED' AND c."isPublic" = true AND c.status = 'ACTIVE'
    )
    SELECT * FROM (
      SELECT a.id, a.title, a.description, a.slug AS "articleSlug", a."sectionSlug", a."sectionTitle",
        ts_rank_cd(a.document, websearch_to_tsquery('english', ${query})) AS rank, 'article'::text AS kind,
        replace(replace(ts_headline('english', a.body, websearch_to_tsquery('english', ${query}), 'MaxFragments=2, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', '') AS snippet,
        a."contentType"::text AS "contentType", a.difficulty::text AS difficulty
      FROM article_documents a
      WHERE a.document @@ websearch_to_tsquery('english', ${query})
        AND (CAST(${section} AS text) IS NULL OR a."sectionSlug" = CAST(${section} AS text))
        AND (CAST(${contentType} AS text) IS NULL OR a."contentType"::text = CAST(${contentType} AS text))
        AND (CAST(${difficulty} AS text) IS NULL OR a.difficulty::text = CAST(${difficulty} AS text))
      UNION ALL
      SELECT g.id, g.term, g.definition, '', '', 'Glossary',
        ts_rank_cd(setweight(to_tsvector('english', g.term), 'A') || setweight(to_tsvector('english', g.definition), 'B'), websearch_to_tsquery('english', ${query})),
        'glossary'::text,
        replace(replace(ts_headline('english', g.definition, websearch_to_tsquery('english', ${query}), 'MaxFragments=1, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', ''),
        'REFERENCE'::text, 'FOUNDATION'::text
      FROM "GlossaryTerm" g JOIN "Company" c ON c.id = g."companyId"
      WHERE to_tsvector('english', g.term || ' ' || g.definition) @@ websearch_to_tsquery('english', ${query})
        AND c."isPublic" = true AND c.status = 'ACTIVE'
        AND CAST(${section} AS text) IS NULL AND CAST(${contentType} AS text) IS NULL AND CAST(${difficulty} AS text) IS NULL
    ) results ORDER BY rank DESC, title ASC LIMIT ${limit}
  `);
}

export async function searchCompanyKnowledge(query: string, companyId: string, includeRestricted: boolean, limit = 30) {
  if (query.trim().length < 2) return [];
  const boundedLimit = Math.min(Math.max(limit, 1), 50);
  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    WITH article_documents AS (
      SELECT a.*, s.slug AS "sectionSlug", s.title AS "sectionTitle",
        setweight(to_tsvector('english', a.title), 'A') ||
        setweight(to_tsvector('english', a.description), 'B') ||
        setweight(to_tsvector('english', a.body), 'C') AS document
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
        ts_rank_cd(a.document, websearch_to_tsquery('english', ${query})) AS rank, 'article'::text AS kind,
        replace(replace(ts_headline('english', a.body, websearch_to_tsquery('english', ${query}), 'MaxFragments=2, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', '') AS snippet,
        a."contentType"::text AS "contentType", a.difficulty::text AS difficulty
      FROM article_documents a WHERE a.document @@ websearch_to_tsquery('english', ${query})
      UNION ALL
      SELECT g.id, g.term, g.definition, '', '', 'Glossary',
        ts_rank_cd(to_tsvector('english', g.term || ' ' || g.definition), websearch_to_tsquery('english', ${query})),
        'glossary'::text,
        replace(replace(ts_headline('english', g.definition, websearch_to_tsquery('english', ${query}), 'MaxFragments=1, MaxWords=28, MinWords=10'), '<b>', ''), '</b>', ''),
        'REFERENCE'::text, 'FOUNDATION'::text
      FROM "GlossaryTerm" g
      WHERE g."companyId" = ${companyId}
        AND to_tsvector('english', g.term || ' ' || g.definition) @@ websearch_to_tsquery('english', ${query})
    ) results ORDER BY rank DESC, title ASC LIMIT ${boundedLimit}
  `);
}
