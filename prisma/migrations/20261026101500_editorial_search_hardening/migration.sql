-- Preserve when a source was actually accessed, not merely the article's review date.
ALTER TABLE "Source" ADD COLUMN "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ArticleSource" ADD COLUMN "claimScope" TEXT;

-- Expression indexes keep the parameterized full-text search usable as content grows.
CREATE INDEX "Article_search_idx" ON "Article" USING GIN (
  to_tsvector('english', "title" || ' ' || "description" || ' ' || "body")
);
CREATE INDEX "GlossaryTerm_search_idx" ON "GlossaryTerm" USING GIN (
  to_tsvector('english', "term" || ' ' || "definition")
);
