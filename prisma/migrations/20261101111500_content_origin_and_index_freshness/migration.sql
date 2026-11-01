-- Distinguish source-controlled content from knowledge created in the Studio.
-- Existing rows default to ADMIN so a deployment cannot archive unknown admin work.
CREATE TYPE "ContentOrigin" AS ENUM ('ADMIN', 'SOURCE', 'IMPORT', 'CONNECTOR');
CREATE TYPE "ContentSyncStatus" AS ENUM ('NOT_APPLICABLE', 'IN_SYNC', 'MODIFIED', 'CONFLICT');

ALTER TABLE "Section"
  ADD COLUMN "origin" "ContentOrigin" NOT NULL DEFAULT 'ADMIN';

ALTER TABLE "Article"
  ADD COLUMN "origin" "ContentOrigin" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "syncStatus" "ContentSyncStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "sourceHash" TEXT,
  ADD COLUMN "embeddingRevision" INTEGER,
  ADD COLUMN "embeddingModel" TEXT;

CREATE INDEX "Article_companyId_origin_syncStatus_idx"
  ON "Article"("companyId", "origin", "syncStatus");

CREATE INDEX "Article_search_simple_idx" ON "Article" USING GIN (
  to_tsvector('simple', "title" || ' ' || "description" || ' ' || "body")
);
CREATE INDEX "GlossaryTerm_search_simple_idx" ON "GlossaryTerm" USING GIN (
  to_tsvector('simple', "term" || ' ' || "definition")
);
