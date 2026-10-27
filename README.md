# Codefyhub-DevOps Guide

> A professional, local-first infrastructure handbook—from physical storage and virtualization to governed CI/CD, application platforms, and production reliability.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Status](https://img.shields.io/badge/build-passing-35d0a2)](#quality-and-verification)

## Overview

Codefyhub-DevOps Guide is a PostgreSQL-backed technical knowledge system for engineers designing, securing, and operating modern infrastructure. It favors decision guidance, validation, troubleshooting, and recovery over unexplained command lists.

The current edition includes 12 disciplines, 62 focused articles, 31 official source collections, 40 glossary terms, an 18-control production-readiness review, and a 48-question adaptive assessment studio.

Open the running guide at [http://localhost:3000](http://localhost:3000).

## What the guide covers

| Discipline | Topics |
|---|---|
| Start here | Reference architecture, safety conventions, lab and production profiles |
| Storage and RAID | RAID tradeoffs, `mdadm`, ZFS, disk replacement, backup boundaries |
| Proxmox VE | Installation, networking, Cloud-Init, LXC, HA, PBS, hardening |
| Secure networking | WireGuard, AmneziaWG, routing, NAT, MTU, Egypt-specific considerations |
| Ubuntu | Development baseline, containers, tools, security, repeatable bootstrap |
| Remote access | SSH, Remote SSH, RDP, VNC, Windows, macOS, Linux, Android, and iOS |
| Production readiness | Monitoring, backups, recovery drills, ownership, RTO and RPO |
| RHEL | Lifecycle, subscriptions, SELinux, firewalld, LVM, Podman, System Roles |
| GitHub engineering | Rulesets, Actions, OIDC, supply-chain security, identity, releases |
| Supabase | Architecture, local workflow, RLS, Auth, Storage, pooling, backups |
| Vercel delivery | Fluid Compute, previews, deployment checks, rollouts, security, telemetry |
| Platform engineering | IaC, golden paths, Kubernetes, OpenTelemetry, SRE, secrets, incidents |

## Product highlights

- Responsive documentation layout with desktop and mobile navigation.
- PostgreSQL full-text search across articles and glossary definitions.
- Sanitized GitHub-Flavored Markdown rendering.
- Copyable command and configuration blocks.
- Difficulty, reading time, and last-verified metadata.
- Official source attribution per article.
- Browser-local article completion and readiness progress.
- Configurable DevOps assessments with four question formats, Practice and Exam modes, confidence calibration, domain scoring, explanations, and saved attempt history.
- Print-friendly articles and reduced-motion support.
- Local health endpoint for application and database status.
- Deterministic database seed that is safe to run repeatedly.
- AI chat assistant (OpenRouter free-tier LLM) for DevOps guidance, accessible via floating widget.

## Architecture

```text
Browser
  ├─ Server-rendered guide, search, glossary, assessment shell, and metadata
  ├─ localStorage progress, checklist, and assessment history
  └─ Accessible responsive interface
        │
        ▼
Next.js 16 · React 19 · TypeScript
  ├─ App Router and Server Components
  ├─ Sanitized Markdown rendering
  ├─ Zod query validation
  └─ /api/health
        │
        ▼
Prisma 7 · PostgreSQL adapter
        │
        ▼
PostgreSQL 18
  ├─ Sections and articles
  ├─ Article revision snapshots
  ├─ Sources and tags
  ├─ Glossary
  └─ Full-text search
```

For the full system design, file-by-file map, data flows, security model, recovery plan, ownership, and roadmap, read [PROJECT_PLAN_AND_INFRASTRUCTURE.md](PROJECT_PLAN_AND_INFRASTRUCTURE.md).

## Technology stack

- Next.js 16 App Router
- React 19
- Strict TypeScript
- Tailwind CSS 4 and a custom responsive design system
- PostgreSQL 18
- Prisma 7 with the PostgreSQL driver adapter
- React Markdown, Remark GFM, and Rehype Sanitize
- Zod request validation
- Vitest unit tests
- Playwright end-to-end checks and pinned GitHub Actions CI/CD
- Docker Compose as an optional portable database runtime

## Quick start on this Windows workstation

### Prerequisites

- Node.js 24 or later
- npm 11 or later
- PostgreSQL 18 already installed for the prepared local database
- PowerShell 7 recommended

### Start the prepared environment

```powershell
Set-Location D:\Projects\DevOps-doc
npm install
npm run db:local:start
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Visit:

- Guide: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

The prepared project-local PostgreSQL cluster listens on `127.0.0.1:5433`. After the first setup, normal startup is only:

```powershell
npm run db:local:start
npm run dev
```

## Portable setup with Docker Compose

Use this path on a different workstation or when Docker is preferred:

```powershell
Copy-Item .env.example .env.local
# Choose a long local-only password and update DATABASE_URL to match.
npm install
docker compose --env-file .env.local up -d postgres
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

The Compose service is health checked and publishes PostgreSQL only on `127.0.0.1`.

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `POSTGRES_USER` | Local database role | `devops_guide` |
| `POSTGRES_PASSWORD` | Local database password | Replace the placeholder |
| `POSTGRES_DB` | Database name | `devops_guide` |
| `POSTGRES_PORT` | Loopback port | `5432` or prepared `5433` |
| `DATABASE_URL` | Prisma connection string | Must match the values above |
| `CONTENT_VERIFIED_AT` | Explicit date of the completed editorial review | `2026-10-26` |
| `CONTENT_REVERIFY` | Set to `true` only when an existing corpus was deliberately re-reviewed | Unset |
| `CONTENT_VERIFIED_BY` | Accountable editorial reviewer or team | `Codefyhub Editorial Team` |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL; leave unset for local-only use | `https://guide.example.com` |
| `NEXT_PUBLIC_REPOSITORY_URL` | Public repository used for source/edit links | `https://github.com/owner/repository` |
| `HSTS_PRELOAD` | Opt in to HSTS subdomain coverage and browser preload only after every subdomain is HTTPS-ready | Unset |
| `OPENROUTER_API_KEY` | API key for OpenRouter free-tier LLM (powers the AI chat assistant). Get one at https://openrouter.ai | `sk-or-...` |

Never commit `.env.local` or reuse its development credentials in a shared environment.

## Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma Client and produce the optimized build without migrating or publishing content |
| `npm run deploy:db` | Apply checked-in migrations as an explicit deployment step |
| `npm run deploy:content` | Publish reviewed content as an explicit deployment step |
| `npm run content:check` | Validate content structure, sources, revisions, reading time, and unsafe command patterns |
| `npm run content:source` | Validate source-authored metadata and required sections without a database |
| `npm run content:internal-links` | Validate published guide links and related-guide relationships |
| `npm run search:check` | Run the committed command, error, product, scenario, and empty search evaluation |
| `npm run secrets:check` | Scan tracked and unignored source files for high-confidence credential patterns |
| `npm start` | Serve the production build |
| `npm run lint` | Run Next.js and TypeScript ESLint rules |
| `npm run typecheck` | Run strict TypeScript without emitting files |
| `npm test` | Run the Vitest test suite |
| `npm run test:e2e` | Run browser journeys against the local app |
| `npm run db:local:start` | Start the prepared local PostgreSQL cluster on port 5433 |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply checked-in migrations non-interactively |
| `npm run db:seed` | Idempotently seed sections, articles, sources, and glossary |
| `npm run db:studio` | Open Prisma Studio for the local database |

## Content workflow

Legacy editorial data lives in the Prisma seed modules. New or substantially upgraded content is authored one file per guide under `site_content/`, with a validated category manifest. The Storage & RAID vertical slice is the reference implementation.

Legacy content currently lives in:

- `prisma/seed.ts`
- `prisma/additional-content.ts`
- `prisma/knowledge-expansion.ts`
- `prisma/gap-content.ts`

Recommended update sequence:

1. Verify new technical claims against current first-party documentation.
2. Edit or add a focused article and its source mapping.
3. Update the verification date and set `CONTENT_REVERIFY=true` only after completing a deliberate corpus review.
4. Run the seed twice to prove it is idempotent; editorial body changes create a new immutable revision.
5. Search for representative terminology in the UI.
6. Run the complete quality gate.

```powershell
npm run db:seed
npm run db:seed
npm run content:source
npm run content:check
npm run content:internal-links
npm run search:check
npm run secrets:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
```

## Database backup and restore

### Docker Compose backup

```powershell
docker compose --env-file .env.local exec -T postgres `
  pg_dump -U devops_guide -d devops_guide -Fc > devops-guide.backup
```

### Prepared local PostgreSQL backup

```powershell
$env:PGPASSWORD = "<local-password>"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
  -h 127.0.0.1 -p 5433 -U devops_guide -d devops_guide `
  -Fc -f devops-guide.backup
Remove-Item Env:PGPASSWORD
```

Store backups away from the PostgreSQL data directory and test restoration in an isolated database. Do not remove the Docker volume or `.local/postgres-data` unless erasing the database is intentional and a verified backup exists.

## Quality and verification

See [the foundation batch report](docs/FOUNDATION_BATCH.md) for dated results, test conditions, and limitations. A passing build does not validate the infrastructure commands in a guide.

## Security notes

- PostgreSQL is loopback-only in both prepared and Compose configurations.
- Search input is bounded and parameterized.
- Database Markdown is sanitized; raw executable MDX is not accepted.
- The site never executes the infrastructure commands it displays.
- Real credentials, private keys, production IPs, and customer data do not belong in seed content.
- VPN guidance is technical information, not legal advice. Egypt-specific use requires local legal and organizational review.
- Local development credentials are not suitable for remote or production deployment.

## Troubleshooting

### Database is unavailable

```powershell
npm run db:local:start
Invoke-RestMethod http://localhost:3000/api/health
```

For Docker:

```powershell
docker compose --env-file .env.local ps
docker compose --env-file .env.local logs postgres
```

### Schema or Prisma client is missing

```powershell
npm run db:generate
npm run db:deploy
npm run db:seed
```

### Port is already in use

- Web: `npm run dev -- --port 3001`
- Database: change `POSTGRES_PORT` and the port in `DATABASE_URL` together.

### Search returns no content

Confirm the seed has been applied and the health endpoint reports `database: connected`.

## Documentation

- [Project plan and infrastructure](PROJECT_PLAN_AND_INFRASTRUCTURE.md)
- [Master autonomous build specification](MASTER_BUILD_PROMPT.md)
- [Prisma schema](prisma/schema.prisma)
- [Core seed](prisma/seed.ts)
- [Advanced content](prisma/additional-content.ts)

## Status and next steps

The platform foundation and Storage & RAID vertical slice are implemented locally. The remaining legacy content needs domain-by-domain review and migration into the validated source model. Follow [the authoring guide](docs/CONTENT_AUTHORING.md) and [the batch report](docs/FOUNDATION_BATCH.md) before publishing.

---

Built as infrastructure documentation should be built: versioned, sourced, searchable, testable, and recoverable.
