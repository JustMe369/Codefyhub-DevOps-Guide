import { Difficulty } from "../generated/prisma/client";

const md = (...lines: string[]) => lines.join("\n");

export const additionalSections = [
  { slug: "rhel", title: "Red Hat Enterprise Linux", summary: "Operate RHEL with lifecycle discipline, SELinux, Podman, and automation-first administration.", icon: "Boxes", order: 8 },
  { slug: "github", title: "GitHub engineering", summary: "Govern source, secure CI/CD, and make software supply chains auditable.", icon: "GitBranch", order: 9 },
  { slug: "supabase", title: "Supabase platform", summary: "Run Postgres, Auth, Storage, Realtime, and Edge Functions with database-first security.", icon: "Database", order: 10 },
  { slug: "vercel", title: "Vercel delivery", summary: "Design previews, releases, compute, security, and observability as one delivery system.", icon: "Cloud", order: 11 },
  { slug: "platform-engineering", title: "Platform engineering", summary: "Connect infrastructure as code, Kubernetes, secrets, observability, and SRE practices.", icon: "Workflow", order: 12 }
];

export const additionalArticles = [
  {
    section: "rhel", slug: "ecosystem-installation", title: "RHEL lifecycle, subscriptions, and installation", description: "Choose a supported release stream and create a secure, repeatable enterprise Linux baseline.", difficulty: Difficulty.FOUNDATION, minutes: 14, order: 1,
    body: md(
      "## RHEL is an operating model",
      "Red Hat Enterprise Linux combines a curated operating system, published lifecycle, certified ecosystem, errata, knowledge base, and support contract. RHEL 8, 9, and 10 use a ten-year major-version lifecycle, but minor-release support differs by subscription and eligible extended lifecycle stream. Pinning a minor release is a business decision, not simply a package-manager preference.",
      "",
      "CentOS Stream is the continuously delivered upstream path immediately ahead of RHEL. AlmaLinux and Rocky Linux follow the Enterprise Linux ecosystem, but a compatible package set is not the same thing as a Red Hat support entitlement. Record which assurance your workload actually requires.",
      "",
      "### Installation decision record",
      "Before booting media, document architecture, major and minor release, subscription, support window, repository set, FIPS requirement, partitioning, encryption, network identity, time source, and recovery access. Use Minimal Install for servers unless a graphical workload requires otherwise.",
      "",
      "```bash",
      "sudo subscription-manager status",
      "sudo subscription-manager repos --list-enabled",
      "sudo dnf update --security",
      "sudo dnf needs-restarting -r",
      "```",
      "",
      "### First-boot validation",
      "Verify `getenforce` returns `Enforcing`, firewalld and auditd are active, time is synchronized, only intended repositories are enabled, and the host appears in the organization inventory. Create a named administrative user in `wheel`, test key-based SSH, and retain console access before disabling password login.",
      "",
      "> **Credential rule:** do not place Red Hat usernames or passwords in shell history, scripts, or golden images. Use supported activation-key or organization workflows for automated registration."
    )
  },
  {
    section: "rhel", slug: "operations-security", title: "Operate and harden RHEL", description: "Master systemd, NetworkManager, LVM, SELinux, firewalld, logging, and evidence-driven troubleshooting.", difficulty: Difficulty.INTERMEDIATE, minutes: 18, order: 2,
    body: md(
      "## Change the system through supported control planes",
      "Use systemd drop-ins instead of editing vendor unit files, NetworkManager connection profiles instead of transient interface commands, and `semanage` plus `restorecon` instead of disabling SELinux. Durable administration means package updates can occur without erasing local intent.",
      "",
      "### Service and journal workflow",
      "```bash",
      "systemctl status <unit>",
      "systemctl cat <unit>",
      "journalctl -u <unit> --since '30 minutes ago'",
      "sudo systemctl edit <unit>",
      "sudo systemctl daemon-reload",
      "sudo systemctl restart <unit>",
      "```",
      "",
      "### SELinux: diagnose before permitting",
      "An AVC denial is evidence, not a reason to disable policy. Confirm Unix permissions, inspect the file and process contexts, check whether a documented boolean or port type already exists, and restore default labels. Generate a custom policy only after reviewing the exact access it grants.",
      "",
      "```bash",
      "getenforce",
      "sudo ausearch -m AVC,USER_AVC -ts recent",
      "ls -Zd /srv/myapp",
      "sudo semanage fcontext -a -t httpd_sys_content_t '/srv/myapp(/.*)?'",
      "sudo restorecon -Rv /srv/myapp",
      "```",
      "",
      "### Storage and networking safety",
      "XFS can grow online but cannot shrink. LVM thin pools require data and metadata monitoring. Remote `nmcli` changes can remove the management path; use console access and checkpoint/rollback capabilities. Firewalld rules should state intended sources and services rather than opening broad port ranges.",
      "",
      "For incidents, capture `sos report`, journal slices, package history, network state, storage health, and a timeline before making broad changes. A reboot may clear symptoms and destroy evidence."
    )
  },
  {
    section: "rhel", slug: "podman-ansible", title: "Containers and automation on RHEL", description: "Use rootless Podman, Quadlet, RHEL System Roles, and Ansible to remove host-by-host drift.", difficulty: Difficulty.ADVANCED, minutes: 16, order: 3,
    body: md(
      "## Rootless first",
      "Podman is daemonless and supports rootless containers through user namespaces. Use fully qualified image names, pin immutable digests for production, scan images, and keep writable data on deliberately labeled volumes.",
      "",
      "```bash",
      "sudo dnf install -y container-tools",
      "podman pull registry.access.redhat.com/ubi10/ubi-minimal:<approved-tag>",
      "podman run --rm registry.access.redhat.com/ubi10/ubi-minimal:<approved-tag> cat /etc/redhat-release",
      "podman inspect <container>",
      "```",
      "",
      "Prefer Quadlet systemd units for current Podman-managed services rather than generating static unit files. Define restart behavior, health checks, resource limits, read-only filesystems, capabilities, and explicit SELinux volume labels.",
      "",
      "## Automate policy, not only packages",
      "RHEL System Roles provide supported Ansible roles for networking, storage, SELinux, firewall, SSH, certificates, journald, kernel settings, Podman, and more. Keep inventory, variables, playbooks, and validation together in Git.",
      "",
      "```yaml",
      "- name: Apply the approved server baseline",
      "  hosts: rhel_servers",
      "  become: true",
      "  roles:",
      "    - redhat.rhel_system_roles.timesync",
      "    - redhat.rhel_system_roles.firewall",
      "    - redhat.rhel_system_roles.sshd",
      "```",
      "",
      "Run automation in check mode where supported, limit the first production run to a canary host, verify service health, and retain rollback instructions. Idempotency is necessary but not sufficient: a playbook can apply the wrong desired state perfectly."
    )
  },
  {
    section: "github", slug: "governance-flow", title: "Repository governance and pull-request flow", description: "Turn repositories, teams, rulesets, and pull requests into a consistent engineering control plane.", difficulty: Difficulty.INTERMEDIATE, minutes: 15, order: 1,
    body: md(
      "## Design the governance hierarchy",
      "Enterprise policies set the ceiling, organizations group ownership, teams express job functions, and repositories contain product-specific controls. Sync permission-bearing teams from the identity provider, keep default access low, and use time-bounded elevated roles for exceptional administration.",
      "",
      "### A defensible ruleset baseline",
      "- Require pull requests and resolved conversations.",
      "- Require named CI, security, and deployment checks.",
      "- Block force pushes and branch deletion.",
      "- Require linear history or a documented merge strategy.",
      "- Restrict bypass to named teams or GitHub Apps and audit every use.",
      "- Protect release tags as carefully as the default branch.",
      "",
      "Rulesets can layer across repository and organization scope. Export approved rulesets as JSON or manage them through APIs so changes are reviewed, reproducible, and measurable with rule insights.",
      "",
      "## Choose flow by release model",
      "Use short-lived branches and GitHub Flow for continuously delivered services. Use release branches only when multiple supported versions or regulated release trains require them. Long-lived integration branches create merge debt and should have a clear reason to exist.",
      "",
      "A pull request should connect requirement, implementation, risk, tests, rollout, and rollback. Small changes are easier to review and safer to revert; human reviewers should spend attention on architecture and failure modes while automation handles formatting and repeatable checks."
    )
  },
  {
    section: "github", slug: "actions-supply-chain", title: "Secure GitHub Actions and the supply chain", description: "Apply least privilege, immutable dependencies, OIDC, attestations, and isolated runners to CI/CD.", difficulty: Difficulty.ADVANCED, minutes: 18, order: 2,
    body: md(
      "## Treat workflow code as production code",
      "A workflow can read source, mint tokens, publish packages, and deploy infrastructure. Review `.github/workflows` and action updates with the same care as application authentication code.",
      "",
      "```yaml",
      "name: ci",
      "on: [pull_request]",
      "permissions:",
      "  contents: read",
      "concurrency:",
      "  group: ci-${{ github.ref }}",
      "  cancel-in-progress: true",
      "jobs:",
      "  test:",
      "    timeout-minutes: 15",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - uses: actions/checkout@<full-reviewed-commit-sha>",
      "        with:",
      "          persist-credentials: false",
      "      - run: npm ci && npm test",
      "```",
      "",
      "Pin third-party actions to full commit SHAs, restrict which actions may run, define minimal `GITHUB_TOKEN` permissions, and pass untrusted event data through environment variables instead of interpolating it into shell scripts. Dependabot can propose updates for pinned actions.",
      "",
      "Use OIDC federation for cloud deployments so jobs exchange a short-lived identity for narrowly scoped credentials. Protect the cloud-side trust policy by repository, branch or environment, workflow, and audience. Use protected GitHub environments for approvals and deployment-specific secrets.",
      "",
      "Generate artifact attestations and an SBOM for release outputs, sign container images, and verify provenance at deployment. Self-hosted runners belong in isolated networks and should be ephemeral; never place a general pull-request runner beside production services."
    )
  },
  {
    section: "github", slug: "identity-releases", title: "Identity, secrets, packages, and release operations", description: "Choose the right automation identity and operate releases with traceability and recovery.", difficulty: Difficulty.ADVANCED, minutes: 14, order: 3,
    body: md(
      "## Prefer identities that expire",
      "Use OIDC for cloud federation, GitHub Apps for organization automation, and fine-grained personal access tokens only for human-tied tooling that cannot use either. Inventory classic PATs, deploy keys, webhook secrets, Apps, Actions secrets, and outside collaborators on a schedule.",
      "",
      "GitHub Apps provide installation-scoped permissions and short-lived tokens. Separate read-only discovery from mutating automation, and make repository selection explicit. A token's small scope matters more than how securely an overprivileged token is stored.",
      "",
      "## Release as a verifiable chain",
      "Commit → reviewed pull request → required checks → immutable artifact → attestation/signature → protected environment → deployment record → monitored rollout. Do not rebuild a release from an unpinned branch after approval; promote the tested artifact.",
      "",
      "GHCR packages are private by default unless visibility is changed. Link packages to their source repositories, set retention deliberately, scan images, and use the built-in token with minimal `packages` permissions inside Actions.",
      "",
      "Stream enterprise audit logs before an incident, because streaming is not retroactive. Alert on ruleset bypass, organization ownership changes, new credentials, workflow permission changes, self-hosted runner registration, and secret-scanning bypass. Test repository and configuration recovery instead of assuming GitHub availability replaces your continuity plan."
    )
  },
  {
    section: "supabase", slug: "architecture-local", title: "Supabase architecture and local workflow", description: "Understand how Postgres, Auth, Data API, Realtime, Storage, Functions, and pooling interact.", difficulty: Difficulty.INTERMEDIATE, minutes: 16, order: 1,
    body: md(
      "## PostgreSQL is the security boundary",
      "Supabase combines PostgreSQL with Auth, the Data API, Realtime, Storage, Edge Functions, Studio, and connection pooling. Auth issues a JWT; services present its claims to PostgreSQL; grants and Row Level Security decide what the caller may do. The durable skill is understanding that path, not memorizing dashboard screens.",
      "",
      "### Local development is not self-hosting",
      "The Supabase CLI starts a development stack for migrations, tests, generated types, and Functions. It is not hardened for public production traffic. Discover current commands with `supabase --help` before scripting them.",
      "",
      "```bash",
      "supabase --version",
      "supabase init",
      "supabase start",
      "supabase migration new add_projects",
      "supabase db reset",
      "supabase test db",
      "```",
      "",
      "Keep schema changes in migrations, seed only deterministic development data, generate client types in CI, and test migrations from an empty database plus an upgrade fixture. Never point local reset commands at a hosted production project.",
      "",
      "### Connections are workload-specific",
      "Use direct connections for migrations and long-lived administration, session pooling for clients that need session features, and transaction pooling for high-concurrency serverless traffic. Budget database connections across application clients and Supabase services; reaching `max_connections` is an availability incident, not a tuning detail."
    )
  },
  {
    section: "supabase", slug: "rls-auth", title: "RLS, Auth, Storage, and API security", description: "Secure every exposed object with explicit grants, operation-specific policies, and tests for both allow and deny cases.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 2,
    body: md(
      "## Grants and policies are separate gates",
      "A grant decides whether a role may perform an operation on an object. An RLS policy decides which rows that operation may affect. Configure and test both. Enable RLS on every table in an exposed schema and revoke privileges the client roles do not need.",
      "",
      "```sql",
      "alter table public.projects enable row level security;",
      "revoke all on table public.projects from anon, authenticated;",
      "grant select, insert, update, delete on table public.projects to authenticated;",
      "",
      "create policy \"members read their projects\"",
      "on public.projects for select",
      "to authenticated",
      "using ((select auth.uid()) = owner_id);",
      "",
      "create policy \"owners update their projects\"",
      "on public.projects for update",
      "to authenticated",
      "using ((select auth.uid()) = owner_id)",
      "with check ((select auth.uid()) = owner_id);",
      "```",
      "",
      "`TO authenticated` proves only that the request uses that database role; it is not row ownership. Do not authorize from user-editable metadata. Use server-controlled app metadata carefully and remember JWT claims remain stale until refresh.",
      "",
      "Keep secret/service credentials server-side because they bypass RLS. Views need explicit security treatment. `SECURITY DEFINER` functions should live outside exposed schemas, validate the caller, use a safe `search_path`, and grant execution narrowly.",
      "",
      "Storage authorization is also RLS on `storage.objects`. Upload replacement may require insert, select, and update permission. Write tests for anonymous and authenticated users across select, insert, update, delete, listing, download, and ownership changes."
    )
  },
  {
    section: "supabase", slug: "production-operations", title: "Operate Supabase in production", description: "Choose managed or self-hosted responsibility and plan upgrades, backups, secrets, observability, and failure recovery.", difficulty: Difficulty.ADVANCED, minutes: 18, order: 3,
    body: md(
      "## Choose who carries the pager",
      "Supabase Cloud supplies managed platform operations and plan-dependent backup capabilities. Self-hosting gives control and isolation but makes the team responsible for operating every service, securing the gateway and Studio, patching PostgreSQL, archiving WAL, backing up Storage objects, rotating secrets, and testing restores.",
      "",
      "> **2026 upgrade warning:** self-hosted Supabase changed several defaults, including PostgreSQL 17 images and Envoy as the default API gateway. Review the Supabase changelog and pinned release notes before every upgrade; never let Compose image tags float in production.",
      "",
      "A database backup does not contain Storage object bytes. Back up the database, object store, configuration, JWT/key material, SMTP configuration, and gateway/reverse-proxy state as separate recovery assets. Restore them together in an isolated environment.",
      "",
      "### Production signals",
      "Monitor database connections and locks, replication lag, disk and WAL growth, slow queries, Auth error and email delivery rates, API latency/error rate, Realtime connections, Storage failures, Function failures, and certificate expiry. Run database security and performance advisors as part of release review.",
      "",
      "### Release workflow",
      "Generate a migration → review SQL and RLS → run database tests → apply to an ephemeral environment → deploy backward-compatible application code → migrate production → verify health and key queries → remove compatibility code later. Destructive column changes belong in an expand-and-contract sequence, not a single release."
    )
  },
  {
    section: "vercel", slug: "architecture-compute", title: "Vercel architecture and Fluid Compute", description: "Understand edge delivery, framework builds, Functions, caching, regions, and the current runtime model.", difficulty: Difficulty.INTERMEDIATE, minutes: 15, order: 1,
    body: md(
      "## A delivery and compute platform",
      "Vercel combines an edge network, framework-aware builds, immutable deployments, routing, caching, and Functions. It can run frontend and backend frameworks; the architectural question is where state lives and how requests move between the edge, compute region, and data services.",
      "",
      "Use the default Node.js runtime on Fluid Compute for most server work. Instances can serve concurrent requests, reuse initialized resources, stream responses, and continue bounded background work. The legacy Edge runtime is deprecated; do not add it just for low latency, middleware, or streaming.",
      "",
      "### Place compute near data",
      "Network round trips dominate many dynamic requests. Locate Functions near the primary database, reuse bounded connection pools, and cache only data whose freshness and authorization semantics allow it. Multi-region compute does not make a single-region writable database multi-region.",
      "",
      "### Workload boundaries",
      "Use Functions for request-driven work, Workflow for durable multi-step execution, Queues for asynchronous delivery, Blob for large file transfer, and Marketplace databases rather than retired Vercel Postgres/KV products. Vercel Function request and response bodies have size limits; upload large objects directly to Blob with scoped client tokens.",
      "",
      "Treat memory, maximum duration, concurrency, external API timeouts, and cancellation as explicit resource budgets. Global mutable state may be reused across requests, so it must never contain request-specific or user-specific authorization state."
    )
  },
  {
    section: "vercel", slug: "deployment-release", title: "Build a controlled Vercel release pipeline", description: "Separate build, verification, promotion, rolling release, and rollback across isolated environments.", difficulty: Difficulty.INTERMEDIATE, minutes: 16, order: 2,
    body: md(
      "## Every commit creates evidence",
      "Preview deployments make a change reviewable before production. Use different credentials and data stores for Development, Preview, and Production. Deployment Protection is required when previews expose unreleased features or realistic data.",
      "",
      "```bash",
      "vercel link",
      "vercel pull --environment=preview",
      "vercel deploy",
      "vercel inspect <deployment-url>",
      "vercel logs --deployment <deployment-id> --level error",
      "vercel deploy --prod",
      "```",
      "",
      "Discover exact CLI flags with `vercel <command> --help`; the CLI evolves. In CI, build once where practical and promote the same verified artifact. Do not make production a second, materially different compilation after approval unless the release model explicitly requires it.",
      "",
      "### Release gates",
      "GitHub rulesets protect merge; Vercel Deployment Checks protect release. Require smoke tests, accessibility checks, migration compatibility, security scanning, and business-critical synthetic flows. Use Rolling Releases for incremental exposure and compare error rate and performance before promotion.",
      "",
      "Rollback restores an earlier application deployment, but it cannot reverse a destructive database migration or external side effect. Use backward-compatible migrations, feature flags, and reversible configuration so application rollback remains meaningful."
    )
  },
  {
    section: "vercel", slug: "security-observability", title: "Secure and observe Vercel production", description: "Layer deployment protection, WAF, identity, headers, telemetry, budgets, and rehearsed incident response.", difficulty: Difficulty.ADVANCED, minutes: 15, order: 3,
    body: md(
      "## Protect before application code",
      "Use platform DDoS protection, Vercel Firewall and rate controls, Deployment Protection, TLS, and framework-level authorization together. Add a tested Content Security Policy, secure cookies, `X-Content-Type-Options`, frame restrictions, and a deliberate referrer policy.",
      "",
      "Secrets belong in the narrowest environment scope and must differ between preview and production. Prefer OIDC-based workload identity and managed KMS signing where supported over long-lived cloud keys. Review team roles, project transfers, production overrides, and forced promotions in audit logs.",
      "",
      "### Observe the release, not only the request",
      "Correlate deployment ID, commit SHA, function, route, trace, and customer-visible error. Track error rate, tail latency, cold starts, active CPU, memory, invocation count, cache hit ratio, egress, external API latency, and Core Web Vitals. Export required telemetry with Drains before native retention expires.",
      "",
      "Set spend alerts and operational alerts separately. A cost spike may be an abuse incident, cache regression, retry storm, or successful traffic event. Each alert needs an owner, a runbook, and a test.",
      "",
      "Rehearse instant rollback, DNS recovery, secret rotation, database failover, firewall emergency rules, and provider outage behavior. Verify the user journey after each exercise rather than stopping at a green deployment status."
    )
  },
  {
    section: "platform-engineering", slug: "iac-golden-paths", title: "Infrastructure as code and golden paths", description: "Create reusable, governed delivery paths with Terraform/OpenTofu, Ansible, policy, and service templates.", difficulty: Difficulty.INTERMEDIATE, minutes: 15, order: 1,
    body: md(
      "## Standardize the safe path",
      "A platform team should reduce cognitive load without hiding critical ownership. Golden paths combine a service template, infrastructure modules, CI workflows, security controls, observability, runbooks, and an escape hatch with review.",
      "",
      "Use Terraform or OpenTofu for declarative infrastructure resources and Ansible for host configuration and orchestration. Keep state remote, encrypted, locked, versioned, and recoverable. Separate plan from apply, require human review for high-impact changes, and use short-lived cloud identity from CI.",
      "",
      "### Module contract",
      "Every reusable module needs typed inputs, safe defaults, pinned providers, outputs, examples, validation, upgrade notes, tests, ownership, and a deprecation policy. Avoid a mega-module whose optional branches encode the entire company.",
      "",
      "### Drift and policy",
      "Schedule read-only drift detection and route findings to owners. Enforce foundational policy—approved regions, encryption, tags, public exposure, backup class, identity boundaries—before apply. An emergency change must be followed by a pull request that reconciles desired state."
    )
  },
  {
    section: "platform-engineering", slug: "kubernetes-observability", title: "Kubernetes and observability foundations", description: "Know when orchestration is justified and build metrics, logs, traces, and alerts around user impact.", difficulty: Difficulty.ADVANCED, minutes: 18, order: 2,
    body: md(
      "## Kubernetes is an operating commitment",
      "Adopt Kubernetes when scheduling, multi-service portability, extensibility, or organizational scale justifies operating the control plane and workload platform. A few stable services may be safer and cheaper on VMs, managed containers, or Functions.",
      "",
      "Production clusters need separated environments, workload identity, network policy, pod security controls, resource requests and limits, disruption budgets, autoscaling, ingress and certificate ownership, secret integration, admission policy, backup, upgrade rehearsal, and a documented tenancy model.",
      "",
      "### Four signals plus context",
      "Measure latency, traffic, errors, and saturation, then connect them with structured logs and distributed traces. Instrument service boundaries with OpenTelemetry and propagate correlation IDs. Retention, redaction, and sampling are architecture choices—not observability afterthoughts.",
      "",
      "Alert on customer-visible symptoms and exhaustion forecasts. Every page should be actionable, owned, and linked to a runbook. Use dashboards for exploration; use service-level objectives and error budgets to decide whether the next investment is reliability or feature velocity."
    )
  },
  {
    section: "platform-engineering", slug: "secrets-sre", title: "Secrets, SRE, and incident readiness", description: "Manage machine identity, reliability targets, change risk, incident response, and recovery as one system.", difficulty: Difficulty.ADVANCED, minutes: 16, order: 3,
    body: md(
      "## Eliminate permanent credentials where possible",
      "Prefer workload identity, OIDC federation, and short-lived tokens. Centralize remaining secrets in an audited manager, encrypt them at rest and in transit, scope them to one workload and environment, rotate automatically, and alert on unusual use. A `.env` file is a delivery format, not a secrets-management system.",
      "",
      "Maintain an inventory linking each credential to owner, consumer, privilege, environment, rotation method, expiry, and emergency revocation. Test rotation while the service is healthy; incident time is too late to discover a hidden dependency on an old key.",
      "",
      "## Reliability is a product constraint",
      "Define service-level indicators from user journeys, choose objectives from business impact, and use error budgets to control change velocity. Track availability together with correctness, freshness, durability, and latency where they matter.",
      "",
      "### Incident loop",
      "Detect → assign incident command → contain → communicate → recover → verify → preserve evidence → learn. Separate coordination, technical response, and communications roles for significant events. Post-incident review should identify system conditions and durable controls, not search for an individual to blame.",
      "",
      "Backups, failover, rollback, and disaster recovery are different mechanisms. Prove each with game days and restore exercises. A complete test verifies the user-facing service, security controls, monitoring, and data integrity after recovery."
    )
  }
];
