# Enterprise Knowledge Bank Hardening Plan

## Goal
Address the audit findings to harden the platform into a governed enterprise Knowledge Base Bank. Prioritize P0/P1 fixes first, focusing on CI migration ordering, tenant isolation at the database level, secure onboarding, complete versioning, tenant-scoped AI/search, and a robust article lifecycle.

## Context
- **Audit source**: Provided user message (audit results, recommended design, upgrade roadmap)
- **Critical files**: 
  - `.github/workflows/quality.yml` - CI deploys app before migrations (P0)
  - `lib/admin/articles.ts` - updateArticle doesn't recheck section belongs to same company when sectionId changes (P0)
  - `lib/admin/article-schema.ts` - schema for articles
  - `prisma/schema.prisma` - current schema with tenant fields (companyId) but lacks composite FKs/RLS
  - `docs/BACKEND_CONTROL_PLANE.md` - existing admin/control plane docs
- **Current state**: Multi-company doc system with tenant scoping in app layer, admin Studio exists, revisions, sources, audit events.

## Decisions to resolve
1. **Migration order strategy**: Change CI to migrate-first (expand→backfill→deploy→contract). How to structure for Vercel prebuilt deploy? Currently in quality.yml: build artifact, deploy prebuilt to Vercel, then apply migrations (lines 66-74). Audit says "Change the release order to migrate first, deploy second, then smoke-test." Also notes "expand → backfill → deploy → contract migrations". Need to restructure deploy job.
2. **Tenant isolation**: Need composite tenant foreign keys (e.g., Article.sectionId must reference Section where Section.companyId matches Article.companyId), database RLS policies, central tenant-scoped data access layer. How to model composite FKs in Prisma? Prisma doesn't directly support composite FKs in the same way as SQL - may need to use `@@index` + constraints via raw SQL migrations or use unique constraints. Also need to add RLS in Postgres. Need to create migrations for this.
3. **Member invitations**: Replace admin-created passwords with secure invitations (expiration, password setup links). Need invitation model, email sending (or token storage), flow in admin. Current auth uses Better Auth - need to understand auth setup.
4. **Complete article versioning**: Version all fields - content, classification, visibility, workflow state, sources, tags, ownership, approval decisions. Current articleSnapshot only captures subset (title, desc, difficulty, contentType, validationStatus, readingMinutes, status, lastVerifiedAt, verifiedBy, verificationMethod, testedVersions). Also need to version sources/tags/ownership/workflow. How? Snapshot needs to be expanded or store related entities.
5. **Tenant-scoped AI assistant**: Build tenant-scoped retrieval, citations, permission-filtered chunks. Currently has AI chat assistant (OpenRouter) - need to understand implementation.
6. **Article lifecycle**: Add author, reviewer, approver, owner, review deadline, expiry, scheduled publishing, review/approval history. Extend schema beyond Draft→Published→Archived.
7. **Browser search test race**: Fix UX race where search input becomes disabled/detached. Need to find search component.
8. **Document ingestion**: File upload, malware scanning, OCR/parsing, chunking, embeddings, Blob storage, queue/workflow.
9. **Audit compliance**: Immutable event payloads, retention, exports, tamper evidence, SIEM/webhook.

## Affected boundaries
- **CI/CD**: `.github/workflows/quality.yml` (deploy job order)
- **Data layer**: `prisma/schema.prisma`, new migrations
- **Admin/API**: `lib/admin/articles.ts`, `lib/admin/article-schema.ts`, related API routes
- **Auth/onboarding**: Better Auth setup, admin user management
- **Search/AI**: Search implementation, AI chat assistant
- **UI**: Search components, admin UI
- **Storage/ingestion**: New models/services

## Data flow
1. **Migrations**: Create/alter tables with composite constraints, add RLS policies
2. **Tenant isolation**: All queries must go through tenant-scoped layer; DB enforces via composite FKs + RLS
3. **Versioning**: On every change to article or related entities, create version snapshot
4. **Invitations**: Create invitation token, send link, user sets password on acceptance
5. **Lifecycle**: Workflow states, assignments, deadlines tracked

## Failure modes
- Migration fails mid-deploy → need rollback strategy
- RLS misconfigured → blocks legitimate access or leaks data
- Composite FK constraints too strict → breaks existing data
- Versioning bloat → need retention
- Invitation token leakage → security risk

## Rollout/migration path
- **Phase 0 (P0)**: 
  1. Fix CI order: in deploy job, run migrations BEFORE building/deploying? Or restructure. Current: generate client, build artifact, deploy prebuilt to Vercel, THEN apply migrations (lines 70-71). Audit says "migrate first, deploy second" - so move migration step before deploy. Also need to ensure migrations run against prod DB. Also "expand → backfill → deploy → contract" - need to plan schema changes carefully.
  2. Add composite tenant FKs and RLS. Need to write migration SQL. Also need to ensure all relations are properly constrained.
  3. Add validation in updateArticle to prevent changing sectionId to different company's section (currently only checks section exists in same company on create; on update, if sectionId changes, need to validate). Looking at updateArticle line 95: `tx.article.update({ where: { id }, data: input.data })` - if input.data.sectionId changes, it doesn't validate the new section belongs to same company. That matches the audit finding.
  4. Replace password creation with invitations.
  5. Fix search test race.
  6. Add API authz and tenant isolation tests.
- **Phase 1**: Knowledge bank structure, lifecycle, features
- **Phase 2**: Ingestion, AI assistant
- **Phase 3**: Enterprise features

## Validation plan
- **CI**: Test workflow changes
- **DB**: Run migrations in staging, verify constraints/RLS
- **Tenant isolation**: Attempt cross-tenant access, should be blocked
- **Invitations**: Test invitation flow end-to-end
- **Versioning**: Verify all fields snapshotted
- **Search**: Fix and run browser tests
- **Tests**: Add tests for tenant isolation, authz

## Implementation tasks (Phase 0 - immediate)
### 1. Fix migration-before-deploy ordering
- [ ] Restructure `.github/workflows/quality.yml` deploy job: apply migrations first, then build/deploy, then smoke tests. Or per audit "migrate first, deploy second, then smoke-test" - current does build then deploy then migrate. Need to move migrate before deploy. But Vercel prebuilt deploy uses built artifact; migrations don't require app code. Better order: checkout, setup, npm ci, generate client, run migrations (deploy:db), build, deploy prebuilt, publish content, smoke test.
- [ ] Add migration strategy notes (expand/backfill/contract) to docs

### 2. Add database-level tenant isolation
- [ ] Update Prisma schema: add composite unique constraints where needed for FKs, consider composite FKs. For example, Article.sectionId should reference Section(id, companyId) - Prisma doesn't support composite FKs directly in relations; need to use `@@unique([id, companyId])` on Section and then reference both, or use raw SQL constraints. Alternative: add composite unique on (id, companyId) and then in relation use both fields.
- [ ] Create migration to add composite unique constraints and foreign keys
- [ ] Add RLS policies on all tenant-scoped tables (enable RLS, create policies using companyId from session/context)
- [ ] Create central tenant-scoped data access layer (e.g., in lib/tenant or use Prisma middleware)
- [ ] Update all queries to go through tenant layer

### 3. Fix cross-company article/section update
- [ ] In `lib/admin/articles.ts` updateArticle: if `input.data.sectionId` is being changed, validate new section belongs to same companyId
- [ ] Add similar validation in other update paths

### 4. Replace password creation with invitations
- [ ] Add Invitation model to schema
- [ ] Create invitation API endpoints (create, accept)
- [ ] Update admin user management UI
- [ ] Integrate with auth flow

### 5. Repair browser search test
- [ ] Find search component causing race condition
- [ ] Fix disabled/detached input issue
- [ ] Make browser suite mandatory

### 6. Add tests
- [ ] API authorization tests
- [ ] Tenant isolation tests

## Open questions
1. What auth system is actually used? Better Auth is in deps and mentioned in docs - need to understand current auth implementation
2. How is companyId passed in requests? Via session/membership
3. RLS implementation strategy - need to set session variable with companyId
4. Invitation email delivery - is there email provider configured?
5. Search component location
6. Browser test files

## Notes
- Follow existing patterns (transactions, audit events, Zod validation)
- Don't break existing functionality
- Migrations must be backward compatible where possible
- Use expand/backfill/contract for schema changes
- All changes go through plan first per instructions
