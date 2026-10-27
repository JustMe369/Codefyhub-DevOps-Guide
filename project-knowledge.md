# Codefyhub DevOps Guide — Project Knowledge Base

This file contains the complete project context for the AI assistant. Use it to answer questions accurately about the guide's structure, content, and technical decisions.

## Project Overview

**Name:** Codefyhub DevOps Guide  
**Description:** A PostgreSQL-backed technical knowledge system for engineers designing, securing, and operating modern infrastructure. It favors decision guidance, validation, troubleshooting, and recovery over unexplained command lists.  
**URL:** https://codefyhub-dev-ops-guide.vercel.app  
**Status:** Production, deployed on Vercel  
**Repository:** https://github.com/JustMe369/Codefyhub-DevOps-Guide

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.4.3 | App Router, Server Components |
| UI | React | 19.3.1 | Component framework |
| Styling | Tailwind CSS | 4.3.3 | Utility-first CSS |
| Language | TypeScript | 6.0.2 | Strict type checking |
| Database | PostgreSQL | 18 | Content storage, full-text search |
| ORM | Prisma | 7.10.1 | Database client, migrations |
| Markdown | react-markdown + remark-gfm + rehype-sanitize | — | Safe MD rendering |
| Validation | Zod | 4.6.7 | Request/response validation |
| Testing | Vitest + Playwright | — | Unit + E2E tests |
| CI/CD | GitHub Actions | — | Quality gate + deploy |
| Hosting | Vercel | — | Production deployment |
| AI | OpenRouter | — | Free-tier LLM chat assistant |

## Content Structure

### 12 Guide Sections (in order)

1. **Start here** — Reference architecture, safety conventions, lab and production profiles
2. **Storage & RAID** — RAID tradeoffs, mdadm, ZFS, disk replacement, backup boundaries
3. **Proxmox VE** — Installation, networking, Cloud-Init, LXC, HA, PBS, hardening
4. **Secure networking** — WireGuard, AmneziaWG, routing, NAT, MTU, Egypt-specific considerations
5. **Ubuntu** — Development baseline, containers, tools, security, repeatable bootstrap
6. **Remote access** — SSH, Remote SSH, RDP, VNC, Windows, macOS, Linux, Android, iOS
7. **Production readiness** — Monitoring, backups, recovery drills, ownership, RTO and RPO
8. **Red Hat Enterprise Linux** — Lifecycle, subscriptions, SELinux, firewalld, LVM, Podman, System Roles
9. **GitHub engineering** — Rulesets, Actions, OIDC, supply-chain security, identity, releases
10. **Supabase platform** — Architecture, local workflow, RLS, Auth, Storage, pooling, backups
11. **Vercel delivery** — Fluid Compute, previews, deployment checks, rollouts, security, telemetry
12. **Platform engineering** — IaC, golden paths, Kubernetes, OpenTelemetry, SRE, secrets, incidents

### Content Statistics

- **Articles:** 62 published
- **Sections:** 12
- **Sources:** 31 official source collections
- **Glossary terms:** 40
- **Content types:** CONCEPT, HOW_TO, RUNBOOK, REFERENCE, CONFIGURATION_RECIPE, LEARNING_PATH
- **Validation statuses:** DRAFT, SOURCE_REVIEWED, LAB_TESTED
- **Difficulty levels:** FOUNDATION, INTERMEDIATE, ADVANCED

## Key Files

| Path | Purpose |
|------|---------|
| `prisma/seed.ts` | Core editorial data — sections, articles, sources, glossary terms |
| `prisma/additional-content.ts` | Advanced content — CI/CD, observability, platform engineering articles |
| `prisma/schema.prisma` | Database schema — Article, Section, Source, GlossaryTerm, ArticleVersion |
| `prisma/migrations/` | SQL migrations — content model, search hardening, editorial evidence |
| `app/api/chat/route.ts` | AI chat API endpoint (OpenRouter integration) |
| `components/ai-chat.tsx` | AI chat client component (floating widget) |
| `app/guides/[section]/[article]/page.tsx` | Individual article page renderer |
| `app/guides/[section]/page.tsx` | Section index page renderer |
| `components/site-header.tsx` | Header with logo, navigation, search |
| `app/layout.tsx` | Root layout with metadata and AI chat integration |
| `README.md` | Project documentation, setup instructions, environment variables |
| `CONTRIBUTING.md` | Contribution guidelines, content standards |
| `SECURITY.md` | Security policy and vulnerability reporting |

## Core Principles

1. **Every layer is explained as a decision, a procedure, and a validation** — not a collection of commands to paste blindly
2. **VPN-first security** — connect to private VPN before any remote display protocol
3. **Never expose RDP 3389, VNC 5900+, Proxmox 8006, or PostgreSQL 5432** directly from a public router
4. **SSH first** — terminal access is the preferred default for development
5. **Backups are worthless without tested restores** — quarterly restore drills required
6. **Verify commands in a lab before production use** — stated on every page

## AI Assistant Behavior Guidelines

- Be concise, technical, and safety-conscious
- Reference specific guide sections when relevant
- Always remind users to verify commands in a lab before production use
- Never present destructive commands without warning, target-verification, recovery path, and expected outcome
- Never use real credentials, production identifiers, or private URLs in examples
- If asked about project internals, reference this knowledge base
- If unsure, say so rather than guessing

## Environment Variables (Vercel Production)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL |
| `OPENROUTER_API_KEY` | API key for OpenRouter free-tier LLM |
| `CONTENT_VERIFIED_AT` | Editorial review date |
| `CONTENT_VERIFIED_BY` | Accountable reviewer |
| `CONTENT_REVERIFY` | Set to `true` only after deliberate corpus review |
| `HSTS_PRELOAD` | HSTS subdomain coverage opt-in |

## Quick Commands

- `npm run dev` — Start development server
- `npm run build` — Production build (migrations + generate + seed + build)
- `npm run typecheck` — TypeScript strict check
- `npm run lint` — ESLint
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run content:check` — Content validation
- `npm run deploy:db` — Apply migrations
- `npm run deploy:content` — Seed content
