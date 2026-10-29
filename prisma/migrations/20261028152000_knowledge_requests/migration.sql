BEGIN;
DO $$ BEGIN CREATE TYPE "KnowledgeRequestStatus" AS ENUM ('OPEN', 'PLANNED', 'RESOLVED', 'DISMISSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "KnowledgeRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "queryNormalized" TEXT NOT NULL,
  "context" TEXT,
  "status" "KnowledgeRequestStatus" NOT NULL DEFAULT 'OPEN',
  "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  "requestedById" TEXT,
  "resolvedArticleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastRequestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "KnowledgeRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KnowledgeRequest_companyId_queryNormalized_key" ON "KnowledgeRequest"("companyId", "queryNormalized");
CREATE INDEX "KnowledgeRequest_companyId_status_occurrenceCount_idx" ON "KnowledgeRequest"("companyId", "status", "occurrenceCount");
ALTER TABLE "KnowledgeRequest" ADD CONSTRAINT "KnowledgeRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeRequest" ADD CONSTRAINT "KnowledgeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeRequest" ADD CONSTRAINT "KnowledgeRequest_resolvedArticleId_fkey" FOREIGN KEY ("resolvedArticleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_knowledge_request_tenant_integrity() RETURNS trigger AS $$
DECLARE article_company TEXT;
BEGIN
  IF NEW."resolvedArticleId" IS NULL THEN RETURN NEW; END IF;
  SELECT "companyId" INTO article_company FROM "Article" WHERE "id" = NEW."resolvedArticleId";
  IF article_company IS NULL OR article_company <> NEW."companyId" THEN
    RAISE EXCEPTION 'Cross-company knowledge request resolution rejected' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "KnowledgeRequest_tenant_integrity" BEFORE INSERT OR UPDATE OF "companyId", "resolvedArticleId" ON "KnowledgeRequest" FOR EACH ROW EXECUTE FUNCTION enforce_knowledge_request_tenant_integrity();
COMMIT;
