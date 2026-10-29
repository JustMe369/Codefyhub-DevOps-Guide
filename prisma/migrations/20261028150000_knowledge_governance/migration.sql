BEGIN;

DO $$ BEGIN CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "reviewDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

UPDATE "Article"
SET "reviewStatus" = 'APPROVED', "reviewedAt" = COALESCE("publishedAt", "updatedAt")
WHERE "status" = 'PUBLISHED';

CREATE TABLE IF NOT EXISTS "MemberInvitation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "invitedById" TEXT NOT NULL,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "MemberInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemberInvitation_tokenHash_key" ON "MemberInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "MemberInvitation_companyId_status_expiresAt_idx" ON "MemberInvitation"("companyId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "MemberInvitation_email_status_idx" ON "MemberInvitation"("email", "status");
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberInvitation" ADD CONSTRAINT "MemberInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CompanyRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_codefyhub_tenant_integrity() RETURNS trigger AS $$
DECLARE related_company TEXT;
BEGIN
  IF TG_TABLE_NAME = 'Article' THEN
    SELECT "companyId" INTO related_company FROM "Section" WHERE "id" = NEW."sectionId";
  ELSIF TG_TABLE_NAME = 'Membership' THEN
    SELECT "companyId" INTO related_company FROM "CompanyRole" WHERE "id" = NEW."roleId";
  ELSIF TG_TABLE_NAME = 'MemberInvitation' THEN
    SELECT "companyId" INTO related_company FROM "CompanyRole" WHERE "id" = NEW."roleId";
  ELSIF TG_TABLE_NAME = 'GlossaryTerm' AND NEW."relatedArticleId" IS NOT NULL THEN
    SELECT "companyId" INTO related_company FROM "Article" WHERE "id" = NEW."relatedArticleId";
  ELSE
    RETURN NEW;
  END IF;

  IF related_company IS NULL OR related_company <> NEW."companyId" THEN
    RAISE EXCEPTION 'Cross-company relationship rejected for %', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_codefyhub_article_link_integrity() RETURNS trigger AS $$
DECLARE article_company TEXT; related_company TEXT;
BEGIN
  SELECT "companyId" INTO article_company FROM "Article" WHERE "id" = NEW."articleId";
  IF TG_TABLE_NAME = 'ArticleSource' THEN
    SELECT "companyId" INTO related_company FROM "Source" WHERE "id" = NEW."sourceId";
  ELSE
    SELECT "companyId" INTO related_company FROM "Tag" WHERE "id" = NEW."tagId";
  END IF;
  IF article_company IS NULL OR related_company IS NULL OR article_company <> related_company THEN
    RAISE EXCEPTION 'Cross-company article relationship rejected for %', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Article_tenant_integrity" BEFORE INSERT OR UPDATE OF "companyId", "sectionId" ON "Article" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_tenant_integrity();
CREATE TRIGGER "Membership_tenant_integrity" BEFORE INSERT OR UPDATE OF "companyId", "roleId" ON "Membership" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_tenant_integrity();
CREATE TRIGGER "MemberInvitation_tenant_integrity" BEFORE INSERT OR UPDATE OF "companyId", "roleId" ON "MemberInvitation" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_tenant_integrity();
CREATE TRIGGER "GlossaryTerm_tenant_integrity" BEFORE INSERT OR UPDATE OF "companyId", "relatedArticleId" ON "GlossaryTerm" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_tenant_integrity();
CREATE TRIGGER "ArticleSource_tenant_integrity" BEFORE INSERT OR UPDATE ON "ArticleSource" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_article_link_integrity();
CREATE TRIGGER "ArticleTag_tenant_integrity" BEFORE INSERT OR UPDATE ON "ArticleTag" FOR EACH ROW EXECUTE FUNCTION enforce_codefyhub_article_link_integrity();

COMMIT;
