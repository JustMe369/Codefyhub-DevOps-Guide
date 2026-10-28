-- Establish the tenant boundary before any company-scoped data can be created.
BEGIN;
DO $$ BEGIN CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");

INSERT INTO "Company" ("id", "name", "slug", "status", "isPublic", "createdAt", "updatedAt")
VALUES ('codefyhub-company', 'Codefyhub', 'codefyhub', 'ACTIVE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company';
ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company',
  ADD COLUMN IF NOT EXISTS "visibility" "ContentVisibility" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company';
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company';
ALTER TABLE "GlossaryTerm" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company';
ALTER TABLE "AuditEvent" ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT 'codefyhub-company';

-- Existing guide content is intentionally public. New content defaults to internal.
UPDATE "Article" SET "visibility" = 'PUBLIC';

DROP INDEX IF EXISTS "GlossaryTerm_term_idx";
DROP INDEX IF EXISTS "GlossaryTerm_term_key";
DROP INDEX IF EXISTS "Section_order_key";
DROP INDEX IF EXISTS "Section_slug_key";
DROP INDEX IF EXISTS "Source_url_key";
DROP INDEX IF EXISTS "Tag_name_key";
DROP INDEX IF EXISTS "Tag_slug_key";
DROP INDEX IF EXISTS "AuditEvent_createdAt_idx";
DROP INDEX IF EXISTS "AuditEvent_entityType_entityId_idx";

CREATE TABLE IF NOT EXISTS "CompanyRole" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Permission" (
    "key" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE IF NOT EXISTS "Membership" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Permission" ("key", "group", "description") VALUES
  ('company.manage', 'Company', 'Manage company settings'),
  ('members.view', 'Members', 'View company members'),
  ('members.manage', 'Members', 'Create, update, and suspend members'),
  ('roles.view', 'Roles', 'View company roles'),
  ('roles.manage', 'Roles', 'Create and update custom roles'),
  ('content.view', 'Knowledge', 'View company knowledge'),
  ('content.create', 'Knowledge', 'Create knowledge drafts'),
  ('content.edit', 'Knowledge', 'Edit knowledge drafts'),
  ('content.review', 'Knowledge', 'Review knowledge changes'),
  ('content.publish', 'Knowledge', 'Publish knowledge changes'),
  ('structure.manage', 'Knowledge', 'Manage spaces, sections, and tags'),
  ('sources.manage', 'Knowledge', 'Manage evidence sources'),
  ('audit.view', 'Governance', 'View the company audit trail'),
  ('ai.use', 'AI', 'Use the company AI assistant'),
  ('ai.manage', 'AI', 'Manage AI settings and analytics')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "CompanyRole" ("id", "companyId", "name", "slug", "description", "isSystem", "createdAt", "updatedAt") VALUES
  ('codefyhub-role-owner', 'codefyhub-company', 'Company Owner', 'company-owner', 'Full company control and ownership protection.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codefyhub-role-knowledge-admin', 'codefyhub-company', 'Knowledge Admin', 'knowledge-admin', 'Manage members, structure, knowledge, and publishing.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codefyhub-role-editor', 'codefyhub-company', 'Editor', 'editor', 'Create and edit company knowledge.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codefyhub-role-reviewer', 'codefyhub-company', 'Reviewer', 'reviewer', 'Review and publish approved knowledge.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codefyhub-role-contributor', 'codefyhub-company', 'Contributor', 'contributor', 'Create and edit assigned drafts.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('codefyhub-role-viewer', 'codefyhub-company', 'Viewer', 'viewer', 'Read published company knowledge.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'codefyhub-role-owner', "key" FROM "Permission" ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT 'codefyhub-role-knowledge-admin', "key" FROM "Permission"
WHERE "key" <> 'company.manage' ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId") VALUES
  ('codefyhub-role-editor', 'content.view'),
  ('codefyhub-role-editor', 'content.create'),
  ('codefyhub-role-editor', 'content.edit'),
  ('codefyhub-role-editor', 'sources.manage'),
  ('codefyhub-role-contributor', 'content.view'),
  ('codefyhub-role-contributor', 'content.create'),
  ('codefyhub-role-contributor', 'content.edit'),
  ('codefyhub-role-reviewer', 'content.view'),
  ('codefyhub-role-reviewer', 'content.review'),
  ('codefyhub-role-reviewer', 'content.publish'),
  ('codefyhub-role-viewer', 'content.view'),
  ('codefyhub-role-viewer', 'ai.use')
ON CONFLICT DO NOTHING;

-- Existing platform administrators become owners of the seeded company.
INSERT INTO "Membership" ("id", "companyId", "userId", "roleId", "status", "createdAt", "updatedAt")
SELECT 'codefyhub-member-' || "id", 'codefyhub-company', "id", 'codefyhub-role-owner', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "user"
WHERE COALESCE("role", '') LIKE '%admin%'
ON CONFLICT DO NOTHING;

CREATE INDEX "Membership_userId_status_idx" ON "Membership"("userId", "status");
CREATE INDEX "Membership_companyId_roleId_idx" ON "Membership"("companyId", "roleId");
CREATE UNIQUE INDEX "Membership_companyId_userId_key" ON "Membership"("companyId", "userId");
CREATE INDEX "CompanyRole_companyId_idx" ON "CompanyRole"("companyId");
CREATE UNIQUE INDEX "CompanyRole_companyId_slug_key" ON "CompanyRole"("companyId", "slug");
CREATE UNIQUE INDEX "CompanyRole_companyId_name_key" ON "CompanyRole"("companyId", "name");
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE INDEX "Article_companyId_status_visibility_idx" ON "Article"("companyId", "status", "visibility");
CREATE INDEX "AuditEvent_companyId_createdAt_idx" ON "AuditEvent"("companyId", "createdAt");
CREATE INDEX "AuditEvent_companyId_entityType_entityId_idx" ON "AuditEvent"("companyId", "entityType", "entityId");
CREATE INDEX "GlossaryTerm_companyId_term_idx" ON "GlossaryTerm"("companyId", "term");
CREATE UNIQUE INDEX "GlossaryTerm_companyId_term_key" ON "GlossaryTerm"("companyId", "term");
CREATE INDEX "Section_companyId_status_idx" ON "Section"("companyId", "status");
CREATE UNIQUE INDEX "Section_companyId_slug_key" ON "Section"("companyId", "slug");
CREATE UNIQUE INDEX "Section_companyId_order_key" ON "Section"("companyId", "order");
CREATE INDEX "Source_companyId_organization_idx" ON "Source"("companyId", "organization");
CREATE UNIQUE INDEX "Source_companyId_url_key" ON "Source"("companyId", "url");
CREATE INDEX "Tag_companyId_idx" ON "Tag"("companyId");
CREATE UNIQUE INDEX "Tag_companyId_slug_key" ON "Tag"("companyId", "slug");
CREATE UNIQUE INDEX "Tag_companyId_name_key" ON "Tag"("companyId", "name");

ALTER TABLE "Section" ADD CONSTRAINT "Section_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Article" ADD CONSTRAINT "Article_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Source" ADD CONSTRAINT "Source_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GlossaryTerm" ADD CONSTRAINT "GlossaryTerm_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyRole" ADD CONSTRAINT "CompanyRole_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CompanyRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CompanyRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
