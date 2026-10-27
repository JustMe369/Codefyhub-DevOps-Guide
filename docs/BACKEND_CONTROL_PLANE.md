# Backend control plane review and foundation

Date: 2026-10-27

## Executive view

The project is already a substantial server-rendered knowledge application, not a static documentation theme. It uses Next.js 16 Route Handlers and Server Components, Prisma 7, PostgreSQL, a revisioned article model, database-backed search, source records, tags, glossary relationships, validated source content, and an OpenRouter-powered assistant with retrieval and feedback telemetry.

The missing product layer was an authenticated control plane. Content could be changed through source files, Prisma seed modules, direct database tooling, or deployment scripts, but there was no safe application-level workflow for editors. That prevented a maintainer from controlling the system as a product.

This batch establishes that workflow without introducing a second backend service:

```text
Browser admin workspace
        │
        ▼
Next.js Route Handlers (Node.js / Vercel Functions)
        │
        ├── Better Auth session and role authorization
        ├── Zod boundary validation
        ├── transactional content services
        └── immutable audit events
        │
        ▼
Prisma 7 → PostgreSQL
```

Next.js Route Handlers are the correct deployment unit because the control plane belongs to the same product, shares the same database and release cycle, and does not need custom system libraries or an independently scaled service. The functions remain stateless; PostgreSQL owns identity, sessions, content, revisions, and audit history.

## Current-state findings

### Strong foundations

- Public URLs and database content relationships are mature and already used by search, sitemap generation, category pages, and the assistant.
- `ArticleVersion` provides a natural base for editorial history.
- Content validation distinguishes draft, source-reviewed, and lab-tested material.
- The source corpus and database publisher provide a reviewable path for large editorial batches.
- PostgreSQL is the appropriate shared persistence layer for content, identity, audit, search, and AI retrieval.
- Vercel Functions are sufficient for synchronous APIs; no container or microservice is justified today.

### Material gaps found

- There was no authenticated admin identity, session store, role check, or protected editing surface.
- There was no application audit log connecting an administrator to a change.
- Article updates had no optimistic-concurrency guard, so two editors could overwrite one another.
- Publication had no server-side rule requiring review evidence and at least one source.
- The recorded handover claimed builds were side-effect-free, while the active `build` script still applied migrations and seeded content. This was corrected.
- Source-controlled content and database-edited content can diverge. The admin interface must eventually show source ownership and sync status before database edits are allowed for every article.
- The assistant backend is operationally separate from editorial content. Its provider cost, rate limits, feedback, retrieval quality, and abuse controls need their own admin surface and durable shared rate limiting.
- Sections, tags, glossary terms, users, AI settings, and deployment actions still need dedicated control screens even where APIs or database models already exist.

## Delivered backend foundation

### Identity and authorization

- Better Auth 1.7 with the Prisma adapter stores users, sessions, accounts, and verification records in PostgreSQL.
- GitHub is the sign-in provider.
- `ADMIN_EMAILS` is an explicit allowlist. Unknown identities are rejected before user creation.
- Allowed first-time identities receive the `admin` role.
- Every protected page performs a real database-backed session check.
- Every admin Route Handler repeats authorization at the data boundary. UI protection is never treated as sufficient authorization.
- Session cookie caching is enabled for five minutes to reduce database reads in Vercel Functions.

### Content control

- `/admin` shows content state and recent audit events.
- `/admin/articles` lists all article states, validation evidence, revisions, and source counts.
- `/admin/articles/[id]` edits the principal article fields and Markdown body.
- Saving requires a human change summary and creates a new immutable `ArticleVersion`.
- The API checks the editor's `expectedUpdatedAt` value and returns HTTP 409 when another write won the race.
- Publication requires `SOURCE_REVIEWED` or `LAB_TESTED` status and at least one attached source.
- Source listing, source creation, and atomic article-source replacement are available through protected APIs.
- Audit events can be paged through a protected API.

### API inventory

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...all]` | GET, POST | Better Auth protocol and GitHub OAuth callbacks |
| `/api/admin/overview` | GET | Counts and recent control-plane activity |
| `/api/admin/articles` | GET, POST | Filter/list articles and create a draft |
| `/api/admin/articles/[id]` | GET, PATCH | Read a full editorial record and save a revision |
| `/api/admin/articles/[id]/publish` | POST | Guarded publication transition |
| `/api/admin/articles/[id]/sources` | PUT | Atomically replace article provenance |
| `/api/admin/sources` | GET, POST | Search and create authoritative sources |
| `/api/admin/audit` | GET | Cursor-paginated audit history |

All write payloads are bounded and validated with Zod. Mutations that affect content plus history/audit are transactional.

## Production configuration

Required environment variables:

```text
BETTER_AUTH_SECRET=<random value with at least 32 bytes>
BETTER_AUTH_URL=https://codefyhub-dev-ops-guide.vercel.app
GITHUB_CLIENT_ID=<GitHub OAuth app client id>
GITHUB_CLIENT_SECRET=<GitHub OAuth app client secret>
ADMIN_EMAILS=<comma-separated allowed GitHub account emails>
```

Create the GitHub OAuth application with this callback URL:

```text
https://codefyhub-dev-ops-guide.vercel.app/api/auth/callback/github
```

Preview OAuth needs a stable branch alias and an additional registered callback. Do not use a wildcard callback. Do not expose any of these values through `NEXT_PUBLIC_` variables.

Apply the database migration before enabling the admin URL:

```powershell
npm run db:generate
npm run deploy:db
npm run build
```

`npm run build` is now compilation-only. Migrations and content publication remain explicit deployment steps.

## Security boundaries

- Authentication data and OAuth tokens are server-only.
- The admin allowlist is deny-by-default when missing.
- Admin APIs return 401 before processing payloads.
- Publishing is a separate transition from saving.
- Concurrent updates fail closed with HTTP 409.
- Audit events retain the actor email even if a user is later removed; the optional user relation becomes null.
- CSP remains active on admin pages.
- Secrets never belong in the database content or audit metadata.

Before production, rotate the credentials previously removed from tracked environment exports, back up the production database, apply the additive migration, configure the five auth variables, and test sign-in plus publication on a non-production article.

## Control coverage and next phases

The phrase “control every point” should be delivered in bounded layers so one admin screen cannot bypass safety systems.

### Phase 1 — delivered here

- Authentication, admin role, protected UI and APIs.
- Article editing, revision history, concurrency protection, publication guardrails.
- Source-management APIs and audit history.
- Build/deployment separation repaired.

### Phase 2 — editorial completeness

Delivered in the current extension:

- Protected Sources and Structure workspaces in the admin navigation.
- Creation APIs and UI for authoritative sources, sections, and tags.
- Article-level source and tag assignment, persisted atomically with audit events.
- Revision-history display with side-by-side body comparison.
- Safe restoration: a prior revision is copied into a new revision; existing history is never overwritten or deleted.

Still intentionally deferred:

- Glossary, redirect, and advanced section-order management.
- Draft preview with a signed, expiring preview URL.
- Structured visual diff for metadata as well as Markdown, plus source/tag state captured in every revision snapshot.
- Source-file ownership indicator and sync conflict handling between `site_content/` and database edits.
- Bulk validation and publication jobs with progress records.

### Phase 3 — people and governance

- Owner, editor, reviewer, and operator roles with granular permissions.
- Invite, suspend, session revocation, and mandatory two-factor authentication.
- Two-person approval for destructive or high-impact operations.
- Retention, export, and tamper-evident audit policies.

### Phase 4 — operations and AI

- Assistant usage, latency, model fallback, feedback, retrieval hit rate, and spend dashboards.
- Shared rate limiting using Redis or a database-backed limiter; in-memory fallback is not globally consistent across Vercel instances.
- Provider/model policy, prompt versions, retrieval evaluation, and kill switches.
- Background validation through Vercel Workflow or Queues only when the work becomes durable or long-running.
- Alerts for database connectivity, failed publications, source freshness, and degraded AI providers.

### Phase 5 — platform administration

- Deployment visibility and rollback links without granting broad Vercel credentials to the browser.
- Backup verification records and restore-drill evidence.
- Feature flags, announcements, and public configuration with an explicit schema.
- Analytics and content-health reporting derived from real events, never invented counters.

## Acceptance checklist for production enablement

- [ ] Production database backup completed and restoration path confirmed.
- [ ] Migration `20261027133000_admin_control_plane` applied.
- [ ] GitHub OAuth callback configured for the production domain.
- [ ] Auth secret and GitHub secret stored only in Vercel encrypted environment variables.
- [ ] Admin email allowlist contains only intended owners.
- [ ] Anonymous `/admin` redirects to sign-in.
- [ ] Anonymous `/api/admin/overview` returns 401.
- [ ] Non-allowlisted GitHub identity is rejected.
- [ ] Allowlisted identity receives an admin session.
- [ ] Saving creates a new revision and audit event.
- [ ] Stale concurrent save returns 409.
- [ ] Draft-without-sources cannot publish.
- [ ] Source-reviewed content with a source can publish.
- [ ] Previous production deployment and database-content rollback procedures are documented and tested.

