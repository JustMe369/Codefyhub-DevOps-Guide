import { Difficulty } from "../generated/prisma/client";

const md = (...lines: string[]) => lines.join("\n");

export const knowledgeExpansionArticles = [
  {
    section: "start-here", slug: "learning-path-lab", title: "Build a safe DevOps learning lab", description: "Choose a learning path, build an isolated lab, and record evidence as you progress.", difficulty: Difficulty.FOUNDATION, minutes: 12, order: 2,
    body: md(
      "## Learning objectives", "By the end, you can separate lab and production risk, choose a role-based path, and define evidence for every exercise.",
      "## Reference lab", "Use a virtualization-capable workstation with at least two isolated networks: management and workload. Keep test credentials, DNS names, and data separate from real environments. Take snapshots only for short-lived rollback; keep independent exports for recovery.",
      "### Learning paths", "| Path | Sequence | Evidence |", "|---|---|---|", "| Infrastructure | Storage → Proxmox → Ubuntu → networking | Diagram, build record, restore test |", "| Delivery | GitHub → Vercel/Supabase → observability | Reviewed PR, deployment record, rollback |", "| Platform/SRE | IaC → Kubernetes → telemetry → incident response | Reproducible environment, SLO, game day |",
      "## Lab procedure", "1. Inventory CPU, memory, disks, NICs, firmware, and recovery media. 2. Draw trust boundaries and data flows. 3. Define an RPO, RTO, owner, and rollback for the lab. 4. Build one layer at a time and save validation output. 5. Deliberately break one safe component and recover it.",
      "## Completion check", "A lab is complete when another engineer can rebuild it from the documentation, verify access controls, and restore representative data without relying on undocumented knowledge."
    )
  },
  {
    section: "storage-raid", slug: "capacity-integrity-performance", title: "Capacity, integrity, and storage performance", description: "Size pools, test failure domains, and measure storage without destroying useful data.", difficulty: Difficulty.ADVANCED, minutes: 18, order: 4,
    body: md(
      "## Design before benchmarking", "Record workload block size, read/write ratio, sync behavior, queue depth, latency objective, growth rate, and rebuild window. Capacity planning must reserve free space for copy-on-write behavior, snapshots, metadata, and emergency recovery.",
      "### Integrity controls", "Use SMART monitoring for device health, filesystem or ZFS checksums for silent corruption, scheduled scrubs, alert delivery, and a documented replacement workflow. Redundancy protects availability; only independent versioned backups protect history.",
      "### Safe performance test", "```bash", "# Run only against a disposable mounted test dataset", "fio --name=randread --directory=/mnt/test --size=2G --rw=randread \\", "  --bs=4k --iodepth=16 --direct=1 --runtime=60 --time_based", "```", "Never aim `fio` at an unverified raw device. Capture latency percentiles, not only throughput.",
      "## Failure lab", "Offline one known lab member, observe degraded state and alert delivery, replace it using stable by-id paths, monitor rebuild/resilver progress, scrub the result, and validate a file checksum. Then restore the same dataset from backup to prove the array is not the only recovery path.",
      "## Exit criteria", "Document usable capacity, maximum tolerated failures, performance evidence, alert ownership, replacement steps, last scrub, last restore, and the point at which growth requires a new pool."
    )
  },
  {
    section: "proxmox", slug: "operations-automation", title: "Operate and automate a Proxmox platform", description: "Harden lifecycle operations, automate templates, and rehearse cluster recovery.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 4,
    body: md(
      "## Production operating model", "Separate management, guest, storage, migration, and backup traffic. Use named administrators, MFA, scoped API tokens, a trusted certificate, and console access that survives a network outage. Keep the hypervisor free of unrelated application workloads.",
      "### Automation contract", "Treat VM templates as versioned artifacts. Record image URL, checksum, packages, Cloud-Init defaults, guest-agent state, and deprecation date. Terraform creates infrastructure; Ansible configures guests. Neither should contain reusable administrator passwords.",
      "```bash", "pveversion -v", "pvesh get /cluster/resources --type vm", "qm config <vmid>", "pvesm status", "pvecm status", "```",
      "## Maintenance runbook", "1. Confirm healthy quorum, storage, replication, backup jobs, and free capacity. 2. Migrate or stop workloads according to their recovery class. 3. Apply updates to one node. 4. Reboot when required and validate networking, storage, time, certificates, and monitoring. 5. Return workloads gradually and observe user-facing checks.",
      "## Recovery exercises", "Test a VM restore into an isolated network, loss of one cluster node, expired API credentials, a failed storage member, and management-network rollback. HA restarts workloads after infrastructure failure; it does not repair application corruption or replace backup testing."
    )
  },
  {
    section: "secure-networking", slug: "routing-dns-mtu-operations", title: "Operate VPN routing, DNS, MTU, and key lifecycle", description: "Diagnose private access systematically and rotate peer access without outages.", difficulty: Difficulty.ADVANCED, minutes: 18, order: 3,
    body: md(
      "## Packet-path model", "For every peer document source address, destination, AllowedIPs, operating-system route, forwarding hop, firewall policy, NAT decision, DNS resolver, and return route. Most VPN incidents become obvious when this path is written down.",
      "### Diagnostic order", "```bash", "sudo wg show", "ip address show", "ip route get <private-destination>", "resolvectl status", "sudo nft list ruleset", "tracepath <private-destination>", "```", "No handshake points to reachability, keys, time, or filtering. A handshake with no traffic points to routes, AllowedIPs, forwarding, firewall, NAT, or MTU. DNS failure with working IP connectivity belongs to resolver policy, not tunnel cryptography.",
      "## Key lifecycle", "Issue one peer key per device and record owner, purpose, allowed networks, creation date, and expiry/review date. Revoke lost devices immediately. Rotate by adding the replacement peer, verifying it, then removing the old peer; never share one private key across a team.",
      "## MTU lab", "Test progressively smaller non-fragmenting packets across the tunnel and both application directions. Set MTU only after evidence; lowering it blindly can hide a broken path. Validate IPv4 and IPv6 separately.",
      "## Safe failure", "For full-tunnel clients, test that the kill switch prevents unintended clear-path traffic. Keep a separate console or break-glass route so a firewall mistake cannot permanently lock out administrators."
    )
  },
  {
    section: "ubuntu", slug: "complete-development-baseline", title: "Build a complete Ubuntu development baseline", description: "Create a reproducible, secure workstation with containers, language tooling, and recovery.", difficulty: Difficulty.INTERMEDIATE, minutes: 22, order: 3,
    body: md(
      "## Baseline layers", "Start with supported Ubuntu LTS, full-disk encryption where appropriate, firmware updates, a named user, time synchronization, automatic security updates, host firewall policy, SSH keys, and tested backups. Add developer tooling only after the operating-system baseline is healthy.",
      "### Reproducible toolchain", "Maintain a version-controlled bootstrap with optional modules for Git, Docker or rootless Podman, VS Code, language version managers, database clients, kubectl, Helm, Terraform/OpenTofu, and Ansible. Pin versions in project files rather than relying on whatever is globally newest.",
      "```bash", "sudo apt update", "apt list --upgradable", "systemctl --failed", "timedatectl status", "sudo ufw status verbose", "ss -lntup", "```",
      "## Security decisions", "Docker-group membership is effectively host-root access. Treat package repositories, editor extensions, language packages, and installation scripts as supply-chain inputs. Keep secrets in an approved secret manager; shell history and `.env` files are not durable secret stores.",
      "## Validation lab", "Run the bootstrap twice, build a representative project, start a container, connect with Remote SSH, restore one user file, and verify the machine after reboot. Capture package sources, tool versions, firewall state, encryption state, backup timestamp, and recovery instructions.",
      "## Recovery", "Keep a rebuild checklist, exported editor settings without secrets, repository list, encryption recovery material, and an independent backup. The goal is replacement within the workstation RTO, not preserving an irreplaceable snowflake."
    )
  },
  {
    section: "remote-access", slug: "ssh-trust-and-gateways", title: "SSH trust, bastions, tunnels, and recovery", description: "Design accountable administrative access through private networks and controlled gateways.", difficulty: Difficulty.INTERMEDIATE, minutes: 18, order: 3,
    body: md(
      "## Trust model", "SSH authenticates the server with a host key and the user with a key, certificate, or other configured method. Distribute host fingerprints through a trusted channel. A changed host key is an incident to investigate, not a warning to suppress globally.",
      "### Client profile", "```sshconfig", "Host bastion", "    HostName <bastion-private-ip>", "    User <named-admin>", "    IdentityFile ~/.ssh/admin_ed25519", "    IdentitiesOnly yes", "Host app-*", "    User <named-admin>", "    ProxyJump bastion", "    IdentityFile ~/.ssh/admin_ed25519", "```",
      "## Access architecture", "Prefer VPN or zero-trust access before SSH/RDP/VNC. Use bastions when centralized session policy and network segmentation justify them. Restrict forwarding where it is not required, disable direct root login, and keep individual identities so revocation and audit remain possible.",
      "## Validation", "Test host-key verification, key-only login, source-network restrictions, idle/session policy, audit logs, and revocation. Confirm that a disabled identity cannot reconnect. Verify access from Windows, macOS, Linux, and the approved mobile client.",
      "## Recovery", "Maintain tested console or out-of-band access. Before changing `sshd_config`, validate with `sshd -t`, keep a second session open, and use a timed rollback for remote firewall changes. Never expose VNC, RDP, or an administrative web console directly to the public internet."
    )
  },
  {
    section: "production", slug: "incident-change-capacity", title: "Incident response, change safety, and capacity", description: "Connect service objectives to alerts, releases, incidents, and resource forecasts.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 4,
    body: md(
      "## Operate from user impact", "Define SLIs for availability, latency, correctness, freshness, and durability where they matter. Choose SLOs from business consequences. Alert on fast and slow error-budget burn, not every transient metric spike.",
      "### Change record", "Every production change needs an owner, purpose, affected services, risk, dependencies, validation, rollback trigger, rollback procedure, and observation window. Prefer small reversible releases. A rollback that cannot reverse its database change is not a complete rollback plan.",
      "## Incident roles", "Assign incident command, technical response, and communications. Record a timeline, hypotheses, actions, and evidence. Contain impact first; preserve logs and deployment identifiers. Communicate what is known, unknown, affected, and when the next update will occur.",
      "## Capacity model", "Track demand, usable capacity, growth rate, saturation, and provisioning lead time. Forecast exhaustion early enough to act. Include database connections, queue depth, storage growth, certificate expiry, backup windows, vendor quotas, and cost—not only CPU and memory.",
      "## Game day", "Simulate a failed dependency or bad release in a controlled environment. Measure detection, assignment, containment, recovery, communication, and verification time. Convert lessons into owned actions and retest them. A postmortem is complete only when durable controls are delivered."
    )
  },
  {
    section: "rhel", slug: "lifecycle-fleet-operations", title: "RHEL fleet lifecycle and compliance operations", description: "Manage registration, patching, SELinux, fleet configuration, and upgrades with evidence.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 4,
    body: md(
      "## Lifecycle decision", "Select a RHEL major/minor stream from application certification, support policy, hardware compatibility, and upgrade horizon. Record repositories, subscriptions, support owner, and end-of-maintenance dates for every fleet class.",
      "### Fleet baseline", "Use Kickstart or image pipelines for installation, RHEL System Roles or Ansible for configuration, and Insights or equivalent evidence for drift and vulnerability review. Keep SELinux enforcing; diagnose denials before writing narrowly scoped policy.",
      "```bash", "subscription-manager status", "dnf repolist", "dnf updateinfo list --security", "getenforce", "ausearch -m AVC -ts recent", "firewall-cmd --list-all", "systemctl --failed", "```",
      "## Patch workflow", "Patch a representative canary, reboot when required, validate services and user journeys, then expand by failure domain. Track excluded packages and compensating controls. Emergency patching still requires rollback and evidence.",
      "## Major upgrade rehearsal", "Use the supported upgrade assessment tooling for the exact source and destination release. Resolve inhibitors, back up configuration and application data, rehearse against a clone, test rollback, and validate subscriptions, repositories, networking, storage, SELinux labels, services, monitoring, and backups after upgrade.",
      "## Compliance evidence", "Retain desired configuration, scan results, approved exceptions, change record, installed package manifest, privileged-access review, and restore evidence. Compliance without repeatable remediation is only a snapshot."
    )
  },
  {
    section: "github", slug: "secure-repository-lifecycle", title: "Secure a repository from creation to archival", description: "Apply identity, rulesets, CI trust, releases, evidence, and recovery across the repository lifecycle.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 6,
    body: md(
      "## Repository contract", "Define owner, visibility, data classification, default branch, review policy, required checks, release process, secret policy, dependency ownership, retention, and archival criteria before onboarding code.",
      "### Pull-request controls", "Require reviewed pull requests, resolved conversations, named status checks, and controlled bypass. Use CODEOWNERS for accountability but remember it does not replace repository permissions. Protect deployment environments separately from merge permissions.",
      "## Workflow trust", "Pin third-party actions to reviewed full commit SHAs, set minimal `GITHUB_TOKEN` permissions, isolate untrusted pull requests, use OIDC for short-lived cloud credentials, and keep self-hosted runners ephemeral and separated from production networks.",
      "```bash", "gh auth status", "gh repo view owner/repo --json visibility,defaultBranchRef", "gh pr checks <number>", "gh run view <run-id> --log-failed", "gh release download <tag> --archive zip", "```",
      "## Release evidence", "Promote immutable artifacts instead of rebuilding approved source. Record commit, checks, SBOM, provenance/attestation, signature, approver, environment, deployment, and rollback target.",
      "## Recovery and archival", "Export critical configuration, retain release artifacts according to policy, inventory credentials and webhooks, test repository restoration, revoke automation identities, then archive. Destructive CLI operations require explicit repository identity verification and a recoverable backup."
    )
  },
  {
    section: "supabase", slug: "database-performance-recovery", title: "Supabase database performance and recovery", description: "Tune queries and connections while preserving authorization, backups, and migration safety.", difficulty: Difficulty.ADVANCED, minutes: 22, order: 4,
    body: md(
      "## Measure at the database boundary", "Use query statistics, execution plans, lock inspection, connection counts, WAL growth, table/index size, and application traces. Optimize representative production shapes rather than synthetic single-row queries.",
      "### Index workflow", "```sql", "explain (analyze, buffers) select * from public.projects", "where owner_id = auth.uid() order by created_at desc limit 50;", "create index concurrently projects_owner_created_idx", "on public.projects (owner_id, created_at desc);", "```", "Test the query under the same role and RLS context used by the application. An index can improve lookup speed while increasing write and storage cost.",
      "## Connection strategy", "Use direct connections for migrations and administration, session pooling when session state is required, and transaction pooling for high-concurrency stateless requests. Set bounded client pools and observe both application and platform connections.",
      "## Migration safety", "Use expand-and-contract changes: add compatible structures, deploy dual-compatible code, backfill in bounded batches, validate, then remove old structures later. Never combine an irreversible schema change with an application release that cannot roll back.",
      "## Recovery", "Document plan-specific database recovery, Storage-object recovery, secrets, Auth configuration, and edge-function deployment separately. Restore into an isolated project, run integrity and RLS tests, then verify the user journey before declaring recovery successful."
    )
  },
  {
    section: "vercel", slug: "caching-routing-cost-operations", title: "Vercel caching, routing, and cost operations", description: "Design cache semantics, deployment routing, regional placement, and spend controls.", difficulty: Difficulty.ADVANCED, minutes: 20, order: 5,
    body: md(
      "## Start with data semantics", "Classify each response by authorization scope, freshness requirement, invalidation trigger, and failure behavior before caching it. Never share user-specific responses through a public cache key.",
      "### Cache contract", "Document whether data is request-only, runtime cached, statically generated, or revalidated. Define tags/keys, maximum staleness, invalidation owner, and how stale data behaves during dependency failure. Validate behavior from response headers and user-visible results.",
      "## Routing and regions", "Keep dynamic compute near the primary writable database. Use rewrites and middleware only where they simplify a clear routing policy. Multi-region compute cannot remove the consistency and latency constraints of a single-region database.",
      "## Release operations", "Protect preview deployments that expose non-public work. Separate development, preview, and production credentials. Require smoke, accessibility, migration-compatibility, and security checks. Promote or roll back immutable deployments; do not edit generated production output.",
      "## Cost signals", "Track invocation count, active CPU, memory, duration, cache hit ratio, bandwidth, image optimization, function errors, and external API retries. Set budget alerts separately from reliability alerts. A cost increase can indicate growth, cache regression, abuse, or a retry storm.",
      "## Exercise", "Force a cache miss, invalidate one tagged dataset, roll back a deployment, rotate one secret, and simulate database latency. Confirm monitoring identifies the deployment and user journey involved."
    )
  },
  {
    section: "platform-engineering", slug: "platform-product-operating-model", title: "Run the internal platform as a product", description: "Design golden paths, tenancy, policy, telemetry, support, and adoption around developer outcomes.", difficulty: Difficulty.ADVANCED, minutes: 22, order: 7,
    body: md(
      "## Product boundary", "A platform is a supported product, not a collection of shared scripts. Identify users, jobs to be done, service levels, supported workload classes, ownership boundaries, and an escape-hatch process.",
      "### Golden-path contract", "A service template should include repository controls, CI, artifact handling, infrastructure modules, workload identity, secrets, deployment, telemetry, SLOs, runbooks, backup class, cost ownership, and upgrade policy. Version the template and publish migration guidance.",
      "## Control planes", "Use Terraform/OpenTofu for infrastructure resources, Ansible or image pipelines for host configuration, GitOps where continuous reconciliation is valuable, and policy as code for non-negotiable boundaries. Keep state encrypted, locked, versioned, and recoverable.",
      "## Kubernetes decision", "Adopt Kubernetes only when scheduling, tenancy, ecosystem, or scale justifies its operational cost. Define workload identity, network policy, admission controls, resource policy, autoscaling, disruption budgets, ingress, certificates, backups, upgrades, and cluster ownership before onboarding production.",
      "## Measure the platform", "Track lead time, deployment success, recovery time, onboarding time, golden-path adoption, support load, reliability, security findings, and cost per workload. Usage alone is not success if teams bypass the platform to deliver safely.",
      "## Game day", "Rebuild a representative environment from code, revoke a workload identity, restore state, rotate a secret, and recover a failed deployment. Feed friction back into the product roadmap."
    )
  }
];

export const knowledgeExpansionGlossary: Array<[string, string]> = [
  ["RACI", "A responsibility model identifying who is responsible, accountable, consulted, and informed."],
  ["Error budget burn", "The rate at which a service consumes the unreliability allowed by its SLO."],
  ["Resilver", "The ZFS process of reconstructing required data onto a replacement or repaired device."],
  ["Write hole", "A parity inconsistency risk when a partial write is interrupted before data and parity are both durable."],
  ["HBA", "A host bus adapter that exposes storage devices directly to the operating system."],
  ["Bastion", "A controlled administrative entry point used to reach systems on restricted networks."],
  ["Jump host", "An SSH intermediary reached before the final destination, commonly configured with ProxyJump."],
  ["Kill switch", "A policy that blocks traffic when the intended private tunnel is unavailable."],
  ["Quadlet", "A systemd generator format for declaratively operating Podman containers and related resources."],
  ["Provenance", "Verifiable information describing how and from which inputs an artifact was produced."],
  ["OIDC federation", "Exchange of a signed workload identity for short-lived provider credentials."],
  ["Expand and contract", "A migration approach that introduces compatible structures before later removing obsolete ones."],
  ["PITR", "Point-in-time recovery using a base backup and transaction logs to restore to a chosen moment."],
  ["Golden signals", "Latency, traffic, errors, and saturation: four complementary service health signals."],
  ["GitOps", "An operating model where desired state in version control is reconciled automatically."],
  ["Admission policy", "Rules evaluated before a workload or resource is accepted into a platform."],
  ["Failure domain", "A set of components likely to fail together because they share infrastructure or dependency."],
  ["Canary", "A limited initial deployment or maintenance target used to evaluate a change before wider rollout."]
];
