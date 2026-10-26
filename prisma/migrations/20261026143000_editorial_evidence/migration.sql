ALTER TABLE "Article"
  ADD COLUMN "verifiedBy" TEXT NOT NULL DEFAULT 'Codefyhub Editorial Team',
  ADD COLUMN "verificationMethod" TEXT NOT NULL DEFAULT 'Documentation and lab review',
  ADD COLUMN "testedVersions" TEXT NOT NULL DEFAULT 'See article and source documentation';

ALTER TABLE "ArticleVersion" ADD COLUMN "snapshot" JSONB;

ALTER TABLE "Source"
  ADD COLUMN "verifiedBy" TEXT NOT NULL DEFAULT 'Codefyhub Editorial Team';
