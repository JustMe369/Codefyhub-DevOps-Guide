CREATE TABLE "SiteConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "headerMenu" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteConfiguration_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteConfiguration" ("id", "headerMenu", "updatedAt")
VALUES (
  'global',
  '[{"id":"guides","label":"Guides","href":"/guides/start-here","visible":true,"featured":false,"newTab":false},{"id":"configs","label":"Configs","href":"/configurations","visible":true,"featured":false,"newTab":false},{"id":"exam","label":"Exam","href":"/exam","visible":true,"featured":false,"newTab":false},{"id":"glossary","label":"Glossary","href":"/glossary","visible":true,"featured":false,"newTab":false},{"id":"readiness","label":"Readiness","href":"/checklist","visible":true,"featured":false,"newTab":false},{"id":"portal","label":"Company Portal","href":"/portal","visible":true,"featured":true,"newTab":false}]'::jsonb,
  CURRENT_TIMESTAMP
);
