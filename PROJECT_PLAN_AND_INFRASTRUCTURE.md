# Codefyhub-DevOps Guide — Project Plan and Infrastructure

## 1. Document purpose

This document is the technical blueprint for the Codefyhub-DevOps Guide. It explains the product scope, system architecture, file ownership, database model, runtime behavior, security boundaries, operating procedures, testing strategy, and future roadmap.

The implementation is a local-first technical knowledge platform. PostgreSQL is the source of truth for editorial content, Next.js renders the public reading experience, and browser-local storage preserves personal completion state without requiring accounts.

## 2. Product mission

The guide should help an engineer move through the complete infrastructure lifecycle:

1. Choose resilient storage and backup patterns.
2. Build and operate Proxmox virtualization.
3. Establish secure private networking.
4. Standardize Ubuntu and RHEL environments.
5. Govern source code and CI/CD through GitHub.
6. Secure application data and identity through Supabase.
7. Release and observe web systems through Vercel.
8. Apply platform-engineering, SRE, and recovery practices across every layer.

The product is intentionally documentation-first. It does not execute infrastructure commands, connect to production services, or silently mutate external systems.

## 3. Current product baseline

| Capability | Current state |
|---|---|
| Guide sections | 12 published sections |
| Articles | 61 focused articles |
| Official source records | 29 |
| Glossary terms | 40 |
| Readiness controls | 18 browser-local checks |
| Assessment studio | 48 questions, 12 domains, 4 formats, Practice and Exam modes |
| Search | PostgreSQL full-text search across articles and glossary |
| Content format | Sanitized Markdown stored in PostgreSQL |
| Database | PostgreSQL 18, local port `5433` |
| Web runtime | Next.js App Router with React and TypeScript |
| Accessibility | Semantic navigation, keyboard controls, reduced-motion and print support |
| Verification | TypeScript, ESLint, Vitest, production build, HTTP route checks, and browser QA |

## 4. System architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│                                                                     │
│ Guide UI · Search · Glossary · Checklist · Assessment · Print view  │
│ localStorage: completion, readiness, and assessment history          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Next.js application                                                 │
│                                                                     │
│ Server Components: guide, article, search, glossary, sitemap        │
│ Client Components: copy, completion, readiness, assessment engine   │
│ Route Handler: /api/health                                          │
│ Markdown pipeline: remark-gfm → rehype-sanitize → React              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Prisma ORM + pg adapter
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PostgreSQL                                                          │
│                                                                     │
│ Sections · Articles · Versions · Sources · Tags · Glossary           │
│ Full-text search with to_tsvector/websearch_to_tsquery              │
└─────────────────────────────────────────────────────────────────────┘
```

### Runtime boundaries

- PostgreSQL is bound to `127.0.0.1`; it is not intended for public network exposure.
- Server Components read editorial data directly through Prisma.
- Search input is validated with Zod and passed to parameterized Prisma SQL.
- Database Markdown is sanitized before rendering; raw executable MDX is not supported.
- Personal reading, readiness, and assessment state remains in the browser and is not transmitted to the server.
- The health endpoint reports only application/database availability and never exposes credentials.

## 5. Technology decisions

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js App Router | Server rendering, metadata, route handlers, and a strong documentation experience |
| Language | Strict TypeScript | Compile-time contracts across UI, database, and content operations |
| UI | React, Tailwind CSS, custom CSS system | Responsive, accessible layout without a heavy component runtime |
| Icons | Lucide React | Consistent accessible visual vocabulary |
| Database | PostgreSQL | Relational content, revisions, source attribution, and native full-text search |
| ORM | Prisma 7 with PostgreSQL adapter | Typed queries, explicit schema, and reproducible migrations |
| Content | Markdown + GFM | Portable editorial format with tables, lists, and fenced commands |
| Validation | Zod | Bounded and predictable request/query parsing |
| Tests | Vitest | Fast unit-level verification |
| Local database | Project-local PostgreSQL or Docker Compose | Works on the prepared Windows host and remains reproducible elsewhere |

## 6. Repository map

Generated directories such as `.next/`, `generated/`, `node_modules/`, and `.local/` are intentionally excluded from the source map.

### Root configuration

| File | Responsibility |
|---|---|
| `README.md` | Primary onboarding, setup, commands, validation, backup, and support guide |
| `PROJECT_PLAN_AND_INFRASTRUCTURE.md` | Architecture, complete source map, operating model, and roadmap |
| `MASTER_BUILD_PROMPT.md` | Original autonomous build specification and acceptance criteria |
| `AGENTS.md` | Version-generated Next.js agent instructions |
| `package.json` | Scripts and pinned application dependencies |
| `package-lock.json` | Reproducible npm dependency graph |
| `tsconfig.json` | Strict TypeScript and Next.js compiler configuration |
| `next.config.ts` | Framework and HTTP security-header configuration |
| `eslint.config.mjs` | Next.js and TypeScript lint rules |
| `postcss.config.mjs` | Tailwind/PostCSS processing |
| `prisma.config.ts` | Prisma schema, migration, seed, and database URL configuration |
| `docker-compose.yml` | Optional health-checked PostgreSQL development service |
| `.env.example` | Safe environment-variable template with placeholders |
| `.gitignore` | Generated output, secrets, logs, and local data exclusions |

### Application routes

| File | Route or responsibility |
|---|---|
| `app/layout.tsx` | Root HTML, metadata, header, footer, and global styles |
| `app/page.tsx` | Architecture-led homepage and section journey |
| `app/globals.css` | Design tokens, responsive layout, article typography, print mode, and reduced motion |
| `app/guides/layout.tsx` | Shared guide navigation shell |
| `app/guides/[section]/page.tsx` | Section overview and ordered article list |
| `app/guides/[section]/[article]/page.tsx` | Article, metadata, table of contents, progress, and official sources |
| `app/search/page.tsx` | Validated PostgreSQL search across articles and glossary |
| `app/glossary/page.tsx` | Alphabetical infrastructure glossary |
| `app/checklist/page.tsx` | Production-readiness review surface |
| `app/exam/page.tsx` | Configurable knowledge-assessment studio and metadata |
| `app/api/health/route.ts` | Web process and database connectivity health check |
| `app/not-found.tsx` | Branded 404 and recovery links |
| `app/sitemap.ts` | Generated local sitemap metadata |
| `app/robots.ts` | Local/private crawler policy |

### Reusable components

| File | Responsibility |
|---|---|
| `components/site-header.tsx` | Brand, primary navigation, and global search |
| `components/footer.tsx` | Product identity and command-safety reminder |
| `components/guide-nav.tsx` | Desktop article tree and collapsible mobile section menu |
| `components/markdown-article.tsx` | Sanitized Markdown renderer and heading anchors |
| `components/code-block.tsx` | Language label and clipboard copy interaction |
| `components/article-progress.tsx` | Browser-local article completion state |
| `components/readiness-checklist.tsx` | Browser-local readiness controls and progress meter |
| `components/exam-engine.tsx` | Topic and format selection, practice/exam sessions, confidence tracking, grading, review, and local history |

### Data and domain files

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Relational content and source-attribution model |
| `prisma/migrations/20261026073804_init/migration.sql` | Initial reproducible database migration |
| `prisma/migrations/migration_lock.toml` | Prisma migration-provider lock |
| `prisma/seed.ts` | Core content, official sources, glossary, and idempotent upserts |
| `prisma/additional-content.ts` | Advanced RHEL, GitHub, Supabase, Vercel, and platform-engineering articles |
| `lib/prisma.ts` | Singleton Prisma client and PostgreSQL driver adapter |
| `lib/utils.ts` | Date and safe search-excerpt helpers |
| `lib/utils.test.ts` | Unit tests for Markdown excerpt behavior |
| `lib/exam-data.ts` | Typed assessment domains, question bank, explanations, and exact-answer grading |
| `lib/exam-data.test.ts` | Coverage, identifier, answer-index, and grading tests for the assessment bank |

### Operations

| File | Responsibility |
|---|---|
| `scripts/start-local-db.ps1` | Starts the prepared project-local PostgreSQL cluster on Windows |

## 7. Database design

```text
Section 1 ─── * Article 1 ─── * ArticleVersion
                    │
                    ├── * ArticleSource * ─── 1 Source
                    ├── * ArticleTag    * ─── 1 Tag
                    └── * GlossaryTerm (optional related article)
```

### Entity responsibilities

- `Section` owns ordered top-level navigation and publication status.
- `Article` owns a section-scoped slug, Markdown body, difficulty, reading time, status, and verification date.
- `ArticleVersion` preserves editorial snapshots and change summaries.
- `Source` records authoritative references and their last verification date.
- `ArticleSource` creates many-to-many source attribution.
- `Tag` and `ArticleTag` support future taxonomy and filtering.
- `GlossaryTerm` stores reusable definitions with an optional related article.

### Integrity rules

- Section slugs and display order are globally unique.
- Article slugs and article order are unique within a section.
- Source URLs and glossary terms are unique.
- Article children cascade on deletion; related glossary links become null rather than deleting definitions.
- The seed uses upserts and can be run repeatedly without duplicating content.

## 8. Request and data flows

### Guide request

1. Next.js resolves section and article route parameters.
2. Prisma selects a published article and its section/source relationships.
3. Missing content returns the branded 404 route.
4. Markdown passes through GFM parsing and HTML sanitization.
5. Server HTML is returned with metadata and table-of-contents anchors.
6. Small client components hydrate completion and copy interactions.

### Search request

1. The browser submits a `q` query parameter.
2. Zod trims the value, caps it at 100 characters, and rejects unsafe shape.
3. Parameterized SQL builds English `tsvector` values for articles and glossary definitions.
4. `websearch_to_tsquery` evaluates the input.
5. Results are ranked, limited to 30, and rendered as internal links.

### Content publication

1. Edit structured seed content.
2. Verify technical claims against current first-party documentation.
3. Update `lastVerifiedAt` when the review is complete.
4. Run generation, migration deployment, and the idempotent seed.
5. Run lint, type checks, tests, build, and representative browser checks.
6. Review official source links and command safety before release.

## 9. Security model

### Application controls

- Strict TypeScript and bounded query validation.
- Parameterized database access through Prisma.
- Sanitized Markdown; raw database HTML is not trusted.
- Security response headers: content-type protection, frame denial, referrer policy, and restrictive browser permissions.
- No authentication or public write API in the current release.
- External references open without granting opener access.
- Secrets are excluded from Git and represented by `.env.example` placeholders.

### Infrastructure controls

- PostgreSQL listens only on loopback.
- Docker Compose publishes PostgreSQL to `127.0.0.1` only.
- Database credentials are development-only and must be replaced for durable or shared use.
- No guide command is executed by the application.
- Disk, firewall, identity, and database examples include validation and risk context.

### Known local-development limitation

The prepared `.env.local` is convenient for this single-user workstation. It is not an enterprise secret-delivery mechanism. Any shared, remote, or production deployment must use a managed secret store, separate credentials, encrypted transport, least-privilege database roles, and a real access-control design.

## 10. Environment strategy

| Environment | Database | Purpose |
|---|---|---|
| Prepared Windows local | Project-local PostgreSQL on `127.0.0.1:5433` | Primary current development environment |
| Portable local | Docker Compose PostgreSQL | Reproducible onboarding on other systems |
| CI | Disposable PostgreSQL service | Migration, seed, tests, and build verification |
| Future preview | Isolated managed database | Stakeholder and browser-flow validation |
| Future production | Managed PostgreSQL with backups/PITR | Published multi-user guide, if authorized |

Development, preview, and production must never share credentials or writable databases.

## 11. Local operations

### Prepared Windows startup

```powershell
npm install
npm run db:local:start
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

### Quality gate

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

### Health verification

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok","database":"connected"}
```

## 12. Backup and recovery plan

The recoverable system consists of two assets:

1. Source code and migration history.
2. PostgreSQL editorial data.

Back up PostgreSQL with a custom-format `pg_dump`, store it separately from the workstation, and periodically restore it into an isolated database. A successful dump command is not a recovery test.

Recovery order:

1. Restore the repository at a known commit.
2. Provision a compatible PostgreSQL instance.
3. Apply migrations or restore the logical backup.
4. Generate the Prisma client.
5. Run the production build.
6. Verify health, article counts, search, glossary, and representative pages.
7. Confirm source links and browser-local features.

## 13. Test strategy

| Test layer | Current or planned verification |
|---|---|
| Static analysis | ESLint and strict TypeScript |
| Unit | Utility behavior and assessment-bank integrity with Vitest |
| Database | Migration from empty DB and seed replay |
| Build | Optimized Next.js production build |
| HTTP smoke | Homepage, platform sections, search, glossary, checklist, assessment, and health |
| Browser | Responsive reading layout, navigation, search, completion, checklist, assessment configuration, feedback, results, review, and console errors |
| Accessibility | Keyboard navigation, focus visibility, semantic landmarks, reduced motion, contrast, and print output |
| Content | Automated structure/source/revision/reading-time gate plus first-party review and destructive-command warnings |

## 14. Content governance

Each technical claim should have an identifiable owner and authoritative source. Time-sensitive platform content—especially Supabase, Vercel, GitHub, Red Hat, Proxmox, Ubuntu, and VPN behavior—must be reviewed before changing `lastVerifiedAt`.

Editorial standards:

- Explain why before showing commands.
- Separate prerequisites, procedure, validation, troubleshooting, and recovery.
- Never present RAID as backup or HA as disaster recovery.
- Never include real credentials, addresses, private keys, or production identifiers.
- Prefer first-party documentation and label community tooling clearly.
- Identify destructive operations before the command block.
- Avoid absolute “best” claims where workload and risk determine the answer.
- Treat Egypt-specific networking guidance as technical information requiring local legal and policy review.

## 15. Delivery roadmap

### Phase 1 — Completed foundation

- Responsive architecture-led homepage.
- PostgreSQL content model and deterministic seed.
- Twelve guide sections and full-text search.
- Sanitized Markdown rendering and copyable commands.
- Glossary, completion tracking, and readiness checklist.
- Professional assessment studio with 36 curated questions, configurable domains and formats, Practice and Exam modes, confidence calibration, skill profiles, review explanations, and saved history.
- Local database startup, health checks, tests, and production build.

### Phase 2 — Editorial operations

- Add an authenticated admin/editor surface.
- Add draft preview and approval workflow.
- Create real article revisions beyond the initial snapshot.
- Add broken-link checking and automated source freshness reports.
- Add tag filtering and related-article recommendations.
- Add per-platform content ownership and review dates.

### Phase 3 — Engineering assurance

- Add Playwright end-to-end tests for search, progress, copy, checklist persistence, and assessment sessions.
- Add automated accessibility testing with axe.
- Add migration tests in CI using disposable PostgreSQL.
- Add Lighthouse budgets and bundle-size monitoring.
- Add Content Security Policy reporting and dependency/license review.

### Phase 4 — Optional publication

- Select a production hosting and managed PostgreSQL design.
- Add authentication only if multi-user progress or editing is required.
- Separate preview and production databases and secrets.
- Add backups, PITR, monitoring, rate limits, WAF, and incident runbooks.
- Define an audience, publishing approval, analytics policy, and privacy notice.

## 16. Definition of done for future changes

A feature or content change is complete only when:

- The requested behavior is implemented without unrelated regressions.
- Database changes include a reviewed migration.
- Seed behavior remains idempotent.
- TypeScript, lint, unit tests, build, and dependency audit pass.
- Representative routes return successful responses.
- Browser QA shows no console errors or layout failures.
- Keyboard, mobile, reduced-motion, and print behavior remain usable.
- New claims link to authoritative sources and carry an accurate verification date.
- README and this architecture document reflect any operational change.

## 17. Ownership model

| Area | Recommended owner |
|---|---|
| Product and information architecture | Platform engineering lead |
| RAID, Proxmox, networking | Infrastructure team |
| Ubuntu and RHEL | Linux operations team |
| GitHub and CI/CD | Developer experience or application security |
| Supabase and data security | Database/platform team |
| Vercel and web delivery | Web platform team |
| SRE, observability, and readiness | Reliability team |
| Editorial review | Named subject-matter owner per section |
| Application code and database schema | Guide maintainers |

The central principle is simple: the guide itself must be operated with the same discipline it teaches—reviewed changes, explicit ownership, reproducible infrastructure, verified recovery, and evidence-based release decisions.
