import Link from "next/link";
import { Prisma } from "@/generated/prisma/client";
import { Search } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripMarkdown } from "@/lib/utils";

type SearchRow = { id: string; title: string; description: string; body: string; articleSlug: string; sectionSlug: string; sectionTitle: string; rank: number; kind: "article" | "glossary" };
const querySchema = z.string().trim().max(100).catch("");

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = querySchema.parse(params.q ?? "");
  const results = query.length >= 2 ? await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT * FROM (
    SELECT a.id, a.title, a.description, a.body, a.slug AS "articleSlug",
      s.slug AS "sectionSlug", s.title AS "sectionTitle",
      ts_rank(
        to_tsvector('english', a.title || ' ' || a.description || ' ' || a.body),
        websearch_to_tsquery('english', ${query})
      ) AS rank, 'article'::text AS kind
    FROM "Article" a
    JOIN "Section" s ON s.id = a."sectionId"
    WHERE a.status = 'PUBLISHED'
      AND to_tsvector('english', a.title || ' ' || a.description || ' ' || a.body)
        @@ websearch_to_tsquery('english', ${query})
    UNION ALL
    SELECT g.id, g.term AS title, g.definition AS description, g.definition AS body,
      '' AS "articleSlug", '' AS "sectionSlug", 'Glossary' AS "sectionTitle",
      ts_rank(
        to_tsvector('english', g.term || ' ' || g.definition),
        websearch_to_tsquery('english', ${query})
      ) AS rank, 'glossary'::text AS kind
    FROM "GlossaryTerm" g
    WHERE to_tsvector('english', g.term || ' ' || g.definition)
      @@ websearch_to_tsquery('english', ${query})
    ) results
    ORDER BY rank DESC, title ASC
    LIMIT 30
  `) : [];

  return (
    <div className="shell search-page">
      <div className="eyebrow">Knowledge search</div>
      <h1>Find the procedure, not the noise.</h1>
      <p>Search across article titles, summaries, commands, and technical guidance.</p>
      <form className="search-large" action="/search"><input name="q" type="search" defaultValue={query} placeholder="Try: cloud-init, RAID 10, MTU…" autoFocus /><button className="button button-primary" type="submit"><Search size={16} />Search</button></form>
      <div className="search-results">
        {query.length > 0 && query.length < 2 && <p>Enter at least two characters.</p>}
        {query.length >= 2 && results.length === 0 && <p>No exact matches. Try a broader technical term.</p>}
        {results.map((result) => (
          <Link className="search-result" href={result.kind === "glossary" ? "/glossary" : `/guides/${result.sectionSlug}/${result.articleSlug}`} key={result.id}>
            <div className="eyebrow">{result.sectionTitle}</div>
            <h2>{result.title}</h2>
            <p>{result.description || stripMarkdown(result.body).slice(0, 170)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
