# Codefyhub Knowledge Bank upgrade roadmap

## Product objective

Codefyhub is evolving from a public DevOps guide into a governed, multi-company information bank. Each company owns an isolated knowledge space containing verified procedures, repeated questions, workflows, incident solutions, glossary terms, sources, and AI-assisted retrieval.

## Implemented foundation

- Company-scoped roles and permissions for viewing, editing, reviewing, publishing, member administration, AI use, and AI management.
- Database-enforced tenant relationships for articles, sections, roles, sources, tags, glossary links, and knowledge-gap resolutions.
- Passwordless administration workflow: administrators grant an existing account access or issue a single-use, seven-day invitation. Only a token hash is stored.
- Editorial lifecycle: draft, review requested, changes requested, approved, then published. Publishing requires approval, source review, and evidence.
- Complete revision snapshots and safe restore-to-draft behavior.
- Visibility levels for public, internal, and restricted knowledge.
- Permission-aware company search and company-scoped AI retrieval.
- Knowledge-gap queue driven by unsuccessful searches, with demand counts and links to verified resolution articles.
- Knowledge-health indicators for review backlog, stale knowledge, and upcoming expiry.
- Same-origin mutation protection, bounded feedback input, rate limiting, privacy-preserving IP hashing, and protected feedback reporting.
- Zero-downtime release ordering: compatible migrations run before the new application release, while source content is published afterward.

## Trust boundaries

```text
Public visitor
  └─ PUBLIC knowledge only

Authenticated company member
  ├─ PUBLIC + INTERNAL knowledge
  └─ company-scoped search and AI

Privileged editor/reviewer/publisher
  ├─ RESTRICTED knowledge when authorized
  ├─ editorial workflow and version history
  └─ audited governance actions

Platform administrator
  └─ cross-company operational control through explicit platform privileges
```

The application always filters by company. PostgreSQL triggers independently reject cross-company relationships so an application bug cannot silently connect one company’s records to another company.

## Delivery roadmap

### Phase 1 — complete the operational studio

- Add department and team collections with owners, subject-matter experts, service criticality, and review policies.
- Add workflow templates for SOPs, runbooks, FAQs, incident solutions, policies, onboarding, and architecture decisions.
- Add dashboards for review SLA, article usefulness, unresolved demand, stale ownership, and search success.
- Add bulk member import and role templates without allowing administrators to choose user passwords.

### Phase 2 — ingestion and automation

- Store attachments in managed object storage with MIME validation, size limits, malware scanning, retention, and signed downloads.
- Move document extraction, chunking, embedding, and re-indexing to an idempotent queue/workflow pipeline.
- Track ingestion jobs and failures in the Studio, with retry and dead-letter controls.
- Add connectors only through scoped service accounts and explicit per-company authorization.

### Phase 3 — enterprise identity and policy

- Add verified company domains, SSO, MFA enforcement, SCIM provisioning, session revocation, and access-review reports.
- Add field-level audit history, export controls, legal hold, retention schedules, and tenant deletion workflows.
- Evaluate PostgreSQL row-level security after request-scoped database identity is introduced; do not enable superficial RLS that shares an unrestricted application role.

### Phase 4 — advanced knowledge intelligence

- Add hybrid lexical/vector retrieval with evaluation datasets per company.
- Route unanswered or low-confidence AI responses into the knowledge-gap queue.
- Add citation coverage, answer-groundedness, freshness, and permission-leak evaluations.
- Add multilingual indexing and Arabic/English editorial workflows.

## Release gates

Every production release must pass schema validation, Prisma generation, tenant-boundary tests, content governance checks, internal-link checks, search evaluation, secret scanning, unit tests, TypeScript, ESLint, production build, and Playwright browser tests. External source-link checks are retried separately because upstream documentation sites can be temporarily unavailable.

## External decisions still required

The next infrastructure tranche needs product choices and credentials for transactional email, object storage, background queues/workflows, enterprise identity, and malware scanning. These integrations must be selected per security, data-residency, cost, and operational requirements; the repository must never contain their secrets.
