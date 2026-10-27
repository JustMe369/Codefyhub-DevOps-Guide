CREATE TYPE "ContentType" AS ENUM (
  'CONCEPT',
  'HOW_TO',
  'RUNBOOK',
  'REFERENCE',
  'CONFIGURATION_RECIPE',
  'LEARNING_PATH'
);

CREATE TYPE "ValidationStatus" AS ENUM ('DRAFT', 'SOURCE_REVIEWED', 'LAB_TESTED');

ALTER TABLE "Article"
  ADD COLUMN "contentType" "ContentType" NOT NULL DEFAULT 'CONCEPT',
  ADD COLUMN "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "applicablePlatforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "applicableVersions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "relatedGuides" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "testedAt" TIMESTAMP(3),
  ADD COLUMN "testEnvironment" TEXT;

CREATE INDEX "Article_content_discovery_idx"
  ON "Article" ("contentType", "difficulty", "validationStatus");
