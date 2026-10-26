# Master Agent Prompt — Professional Codefyhub-DevOps Guide

Copy everything below this line into a capable coding agent. The agent is expected to build and verify the complete website, not merely generate a mockup.

---

You are a senior product designer, DevOps architect, technical writer, full-stack engineer, database engineer, accessibility specialist, and QA engineer working as one coordinated delivery team.

Build a production-quality, locally runnable website named **Codefyhub-DevOps Guide**. It must teach infrastructure decisions in a clear progression:

1. Storage fundamentals and RAID selection
2. Proxmox VE installation and production configuration
3. Virtual machines, LXC containers, and the best guest operating systems
4. Secure remote networking with WireGuard and AmneziaWG, including practical considerations for users in Egypt
5. Ubuntu as a professional development environment
6. Remote access to Ubuntu from Windows, macOS, Linux, Android, and iOS
7. Security hardening, backup, monitoring, automation, and production-readiness checklists

The website must feel like a premium technical knowledge product, not a generic blog, a template landing page, or a collection of decorative cards. Prioritize correctness, navigability, readable technical content, safe commands, and strong visual hierarchy.

## Source material

Read and consolidate these source documents before designing the information architecture:

- `C:\Users\pc\.codex\attachments\68e65fe6-779a-4f8d-b2ec-a5ee52993a75\Pasted text.txt`
- `C:\Users\pc\.codex\attachments\ac8a4059-cdb9-483f-aa12-a0476d5b0521\Pasted text.txt`
- `C:\Users\pc\.codex\attachments\73f5e026-78ab-4c14-8ee0-4005426a3e2a\Pasted text.txt`

Treat these documents as editorial drafts, not unquestionable truth. Remove duplication, reconcile contradictions, and verify time-sensitive claims against primary official documentation. Do not invent statistics, performance numbers, legal claims, software versions, customer quotes, or security guarantees. Every version-sensitive statement must show a “last verified” date and link to its source.

Use official sources wherever possible, including Proxmox, Ubuntu/Canonical, WireGuard, Amnezia, Docker, PostgreSQL, and the relevant operating-system vendors. For Egypt-specific connectivity or regulatory statements, use careful language, provide sources, distinguish confirmed facts from field observations, and add a visible notice that readers must follow applicable law and organizational policy. Do not promise that a protocol, port, obfuscation setting, or ISP workaround will always work.

## Delivery scope

Create the project inside the current workspace. It must run locally on the user’s Windows PC and use a local PostgreSQL database. Use Docker Compose for PostgreSQL so setup is reproducible. Do not publish or expose the local database to the internet.

Use this preferred stack unless the repository already has a compatible established stack:

- Current stable Next.js with App Router and TypeScript
- Tailwind CSS
- Accessible component primitives, preferably shadcn/ui or Radix-based equivalents
- PostgreSQL in Docker Compose
- Prisma ORM with migrations and a deterministic seed script
- Server-side rendering for guide pages and metadata
- Zod for input validation
- Vitest for unit tests and Playwright for critical end-to-end paths
- ESLint and strict TypeScript

Pin compatible dependency versions in the lockfile. Never blindly use `latest` in Docker images or production dependencies. Store secrets only in `.env.local`; commit a safe `.env.example` with placeholders. Ensure `.env*` secrets are ignored by Git.

## Product experience

Design a distinctive professional interface inspired by an infrastructure operations console and a beautifully typeset technical handbook. Use a dark graphite/navy foundation, restrained electric cyan or teal accents, warm amber for warnings, and high-contrast typography. Avoid neon overload, glassmorphism everywhere, excessive gradients, oversized empty hero sections, and repetitive card grids.

The experience must include:

- A compact top navigation with product name, global search, theme toggle, and mobile menu
- A desktop documentation layout with a collapsible left chapter tree, central article column, and sticky right-side table of contents
- A polished mobile reading experience with drawer navigation and no horizontal overflow
- A purposeful home page that presents the infrastructure journey as a connected architecture, not merely a marketing hero
- Full-text search with keyboard navigation and highlighted results
- Breadcrumbs, previous/next lesson navigation, reading time, difficulty, last-verified date, and source links
- Copy buttons for every command and configuration block
- Syntax highlighting, line wrapping controls, clear shell context, and warnings before destructive commands
- Tabs for operating-system-specific instructions
- Expandable “Why this choice?”, “Common failure”, “Security note”, and “Troubleshooting” callouts
- Interactive comparison tables that remain usable on small screens
- Progress tracking stored locally in the browser; do not require login for the first release
- Print-friendly article styling
- A glossary for terms such as RAID, ZFS, KVM, LXC, bridge, VLAN, Cloud-Init, DPI, VPN, RDP, VNC, and SSH
- A production readiness checklist whose completion is saved locally

Subtle motion is welcome for navigation and diagrams, but honor `prefers-reduced-motion`. Icons must have accessible labels where needed. Do not use emoji as the primary icon system.

## Information architecture

Create the following main sections and give each section an overview, decision guidance, step-by-step procedures, validation checks, troubleshooting, security notes, and official references.

### 1. Start Here

- Who the guide is for
- Reference architecture: physical disks → RAID/ZFS → Proxmox → VM/LXC → Ubuntu → secure remote access → developer tools
- Lab, small business, and production profiles
- Safety conventions used in commands
- “RAID is not backup” explained prominently

### 2. Storage and RAID

- RAID 0, 1, 5, 6, 10 comparison
- Minimum disks, usable-capacity formula, fault tolerance, read/write characteristics, rebuild risk, and common use cases
- Decision wizard based on disk count, workload, availability target, and capacity preference
- Recommendation patterns: RAID 1 for boot, mirrors/RAID 10 for VM workloads, RAIDZ2 or equivalent for large capacity where appropriate
- Hardware RAID vs Linux `mdadm` vs ZFS
- Step-by-step `mdadm` examples with explicit destructive-action warnings
- ZFS mirrors, RAIDZ1/2/3, checksumming, compression, scrub, SMART monitoring, snapshots, and backup boundaries
- Validation commands and disk-replacement runbook

Never present a single RAID level as universally “best.” Explain tradeoffs and workload fit.

### 3. Proxmox VE

- Hardware and BIOS/UEFI prerequisites
- Installation media preparation and step-by-step installation
- Static management network and safe first login
- Subscription and repository choices described accurately and respectfully
- Storage options: directory, LVM-Thin, ZFS, NFS, iSCSI, Ceph, and Proxmox Backup Server
- Linux bridges, VLANs, bonds/LACP, management-plane isolation, and example topologies
- VM vs LXC decision table
- Ubuntu Server LTS as the default general DevOps guest, while explaining when Debian, Windows Server, or another distribution is a better fit
- Ubuntu Cloud-Init template creation, cloning, and validation
- Cluster quorum, HA prerequisites, migration, backup, disaster recovery, and restore testing
- Security hardening, RBAC, MFA, SSH keys, firewalling, certificates, monitoring, and patching
- Terraform and Ansible integration overview without embedding real credentials
- Upgrade guidance that directs readers to the exact official guide for their installed version

Do not hard-code “Proxmox 8.x is current.” Detect or research the current supported release at build time, label version-specific content, and preserve a clear path for multiple documentation versions.

### 4. Secure Networking

- WireGuard concepts, topology, keys, peers, routes, NAT, DNS, MTU, persistent keepalive, split tunnel vs full tunnel, and kill-switch considerations
- A secure Ubuntu server installation path using official packages and auditable configuration
- Server and client validation commands
- Client setup tabs for Windows, macOS, Linux, Android, and iOS
- QR-code handling guidance that warns that a QR code contains a private client configuration and must not be shared
- AmneziaWG overview, how it differs from standard WireGuard, supported clients, configuration workflow, and maintenance expectations
- A careful Egypt-specific section explaining that network filtering can differ by ISP, location, time, and protocol behavior
- Troubleshooting decision tree: DNS failure, no handshake, handshake but no traffic, MTU issue, routing/NAT issue, firewall issue, and suspected network filtering
- Prefer official Amnezia documentation. If mentioning community installer scripts, do not execute them blindly; teach readers to inspect pinned releases, checksums/signatures, script contents, and rollback options first

Never recommend exposing RDP, VNC, Proxmox port 8006, or PostgreSQL directly to the public internet. Prefer access through a VPN or a properly configured zero-trust gateway.

### 5. Ubuntu Development Environment

- Balanced comparison of Ubuntu, Debian, Fedora, macOS, and Windows/WSL; avoid unsupported claims that Ubuntu is objectively best for everyone
- Ubuntu Desktop LTS vs Ubuntu Server LTS decision guide
- Installation, disk encryption, updates, drivers, users, SSH, firewall, time sync, and unattended security updates
- Git, build tools, Docker Engine/Compose, VS Code, language version managers, containers, Kubernetes CLI tooling, Terraform, Ansible, and database clients
- A repeatable bootstrap script that is idempotent, readable, and broken into optional modules
- Developer security: least privilege, SSH keys, secret storage, signed commits as an optional practice, and dependency hygiene
- Backup and workstation recovery checklist

### 6. Remote Access

- SSH as the default DevOps method
- VS Code Remote SSH
- RDP for a full desktop
- VNC only as a controlled fallback
- OS-specific setup for Windows, macOS, Linux, Android, and iOS
- Key-based login, SSH config aliases, agent usage, port forwarding, and file transfer
- Safe network model: VPN first, then SSH/RDP/VNC over the private tunnel
- Troubleshooting commands and a connectivity flowchart

### 7. Operations and Production Readiness

- Monitoring and alerting
- Capacity planning
- Patch cadence
- Backup policy and the 3-2-1-1-0 principle
- Restore drills and RTO/RPO
- Incident response basics
- Change management and documentation ownership
- Final interactive readiness checklist with export-to-print capability

## PostgreSQL content model

Store editorial content and navigation metadata in PostgreSQL. Do not store static UI configuration in the database unnecessarily. At minimum, model:

- `sections`: slug, title, summary, icon, order, status
- `articles`: section, slug, title, description, body in Markdown/MDX-compatible text, difficulty, reading time, order, status, published timestamp, last verified timestamp
- `article_versions`: article, revision number, body snapshot, change summary, created timestamp
- `sources`: title, organization, URL, source type, accessed/verified date
- `article_sources`: article/source relationship and optional note
- `tags` and `article_tags`
- `glossary_terms`: term, definition, related article

Use UUIDs or another deliberate primary-key strategy, unique constraints on slugs, indexes for ordering and lookup, foreign keys, timestamps, and migrations. Add PostgreSQL full-text search across titles, descriptions, headings, body text, and glossary terms. Sanitize rendered Markdown/MDX; raw HTML from database content must be disabled or strictly sanitized.

Seed the database with the consolidated content from the three supplied documents. The seed must be deterministic and safe to rerun. Content should be broken into focused articles rather than one enormous page.

## Required local developer experience

Provide:

- `docker-compose.yml` with a health-checked PostgreSQL service, named volume, non-default development credentials read from environment variables, and no public exposure beyond localhost
- `.env.example`
- Database migrations and seed command
- A one-command or clearly documented startup path
- A comprehensive `README.md` containing prerequisites, setup, commands, database reset procedure, backup/restore instructions, test commands, and troubleshooting
- Windows PowerShell-friendly commands as well as standard npm commands
- A health endpoint that verifies the web process and database connectivity without exposing secrets

Suggested workflow:

1. Copy `.env.example` to `.env.local` and choose local-only credentials.
2. Start PostgreSQL with Docker Compose.
3. Install dependencies.
4. Apply migrations.
5. Seed content.
6. Start the development server.

Do not silently delete databases, volumes, migrations, or user content. Any reset command must be clearly marked destructive and require intentional execution.

## Security requirements

- No secrets, private keys, production IPs, or real credentials in source, seeds, screenshots, or examples
- Parameterized database access through the ORM
- Strict validation for search/query parameters
- Secure headers and a restrictive Content Security Policy compatible with the application
- External links use safe attributes where appropriate
- Dependencies audited; document unresolved material findings
- Command examples use placeholders that are visually distinct from literal values
- Destructive disk and networking commands include prerequisites, backup warning, affected-device example, validation step, and rollback/recovery note
- Never render untrusted Markdown as executable MDX

## Accessibility, SEO, and performance

- Meet WCAG 2.2 AA for keyboard use, focus visibility, landmarks, labels, contrast, error states, and reduced motion
- Use semantic HTML and a logical heading outline
- Provide metadata, canonical URLs, Open Graph fields, sitemap, and robots configuration appropriate for local/private development
- Achieve strong Lighthouse results in production mode: target at least 90 for accessibility, best practices, SEO, and performance on core pages
- Avoid layout shift, oversized client bundles, and loading all article content into the browser
- Use responsive images only where imagery adds instructional value

## Testing and verification

Before declaring completion:

1. Run strict TypeScript checks, unit tests, production build, and database migration from an empty database.
2. Run the seed twice to prove idempotency.
3. Test home, section, article, search, glossary, checklist, and 404 routes.
4. Test keyboard-only navigation and visible focus.
5. Test at mobile, tablet, laptop, and wide desktop sizes.
6. Test dark and light themes and reduced motion.
7. Verify every copy button and OS tab.
8. Check for horizontal overflow, unreadable tables, broken anchors, broken links, console errors, and hydration warnings.
9. Verify representative commands and configurations against official documentation without executing destructive infrastructure operations.
10. Produce a final audit listing completed features, test results, known limitations, and the exact local URL.

## Execution behavior

Work autonomously and continue until the complete local product is implemented and verified. Begin by inspecting the workspace and source documents. If no project exists, scaffold one. Maintain a concise task checklist and update it as work progresses. Make sensible product decisions without repeatedly asking for preferences.

Do not stop after producing a plan, wireframe, database schema, or partial homepage. Do not replace real content with lorem ipsum. Do not claim tests passed unless they were actually run. Preserve unrelated user files and changes. Use safe, reversible operations and never erase Docker volumes or local databases without explicit user authorization.

At the end, provide:

- A concise summary of what was built
- Exact setup and run commands for Windows PowerShell
- The local website URL
- Test/build/migration results
- Database location and backup instructions
- Any content that still needs legal, security, or subject-matter review

The final result should make a technical reader feel guided from raw disks to a secure, maintainable DevOps platform, with every major decision explained, every procedure verifiable, and every risky action clearly signposted.
