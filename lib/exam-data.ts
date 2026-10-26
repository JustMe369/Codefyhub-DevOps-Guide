export type ExamTopic = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
};

export type QuestionType = "single" | "multiple" | "boolean" | "scenario";
export type ExamDifficulty = "foundation" | "intermediate" | "advanced";

export type ExamQuestion = {
  id: string;
  topic: string;
  type: QuestionType;
  difficulty: ExamDifficulty;
  prompt: string;
  context?: string;
  options: string[];
  correct: number[];
  explanation: string;
  objective: string;
  guideHref: string;
};

export const examTopics: ExamTopic[] = [
  { slug: "start-here", title: "Architecture fundamentals", shortTitle: "Start here", description: "Failure domains, recovery objectives, and sound platform decisions." },
  { slug: "storage-raid", title: "Storage & RAID", shortTitle: "Storage", description: "RAID tradeoffs, ZFS operations, integrity, and backup boundaries." },
  { slug: "proxmox", title: "Proxmox VE", shortTitle: "Proxmox", description: "Host design, VM and container choices, clustering, and recovery." },
  { slug: "secure-networking", title: "Secure networking", shortTitle: "Networking", description: "WireGuard, AmneziaWG, routing, access control, and diagnostics." },
  { slug: "ubuntu", title: "Ubuntu workspace", shortTitle: "Ubuntu", description: "Stable developer systems, packages, containers, and hardening." },
  { slug: "remote-access", title: "Remote access", shortTitle: "Remote access", description: "SSH trust, client configuration, and safe administration." },
  { slug: "production", title: "Production readiness", shortTitle: "Production", description: "Observability, backups, change control, and incident readiness." },
  { slug: "rhel", title: "Red Hat Enterprise Linux", shortTitle: "RHEL", description: "Lifecycle management, SELinux, systemd, Podman, and automation." },
  { slug: "github", title: "GitHub engineering", shortTitle: "GitHub", description: "Repository governance, Actions security, and software supply chains." },
  { slug: "supabase", title: "Supabase platform", shortTitle: "Supabase", description: "Postgres security, RLS, Auth, Storage, and production operations." },
  { slug: "vercel", title: "Vercel delivery", shortTitle: "Vercel", description: "Preview environments, deployments, runtime behavior, and protection." },
  { slug: "platform-engineering", title: "Platform engineering", shortTitle: "Platform", description: "IaC, Kubernetes, secrets, observability, and SRE practices." }
];

export const questionTypeLabels: Record<QuestionType, string> = {
  single: "Single choice",
  multiple: "Multiple select",
  boolean: "True or false",
  scenario: "Scenario"
};

export const questionBank: ExamQuestion[] = [
  {
    id: "arch-rpo-rto", topic: "start-here", type: "single", difficulty: "foundation",
    prompt: "Which statement correctly distinguishes RPO from RTO?",
    options: ["RPO is acceptable data loss; RTO is acceptable service restoration time.", "RPO is recovery time; RTO is backup frequency.", "RPO measures uptime; RTO measures latency.", "They are two names for the same recovery target."],
    correct: [0], explanation: "RPO defines how much data loss the business can tolerate, while RTO defines how quickly service must be restored. Both should drive architecture and test design.",
    objective: "Connect business recovery targets to technical design.", guideHref: "/guides/start-here"
  },
  {
    id: "arch-failure-domain", topic: "start-here", type: "scenario", difficulty: "intermediate",
    prompt: "A service runs on two VMs on the same physical host and uses the same storage pool. What is the most important design weakness?",
    context: "The team describes the service as highly available because two application instances are running.",
    options: ["The instances share host and storage failure domains.", "The VMs should use identical IP addresses.", "Two instances always require two operating systems.", "The service needs a larger CPU allocation."],
    correct: [0], explanation: "Redundancy inside one failure domain does not protect against loss of that domain. Host and storage separation must match the failures the service is meant to survive.",
    objective: "Identify hidden shared failure domains.", guideHref: "/guides/start-here"
  },
  {
    id: "arch-defense-layers", topic: "start-here", type: "multiple", difficulty: "advanced",
    prompt: "Which practices make an infrastructure decision defensible? Select all that apply.",
    options: ["Document the risk and assumptions.", "Define measurable validation checks.", "Prepare a tested rollback or recovery path.", "Prefer the newest tool regardless of operational skill."],
    correct: [0, 1, 2], explanation: "A defensible change connects intent, risk, evidence, and recovery. Novelty alone is not an operational justification.",
    objective: "Apply decision discipline to infrastructure changes.", guideHref: "/guides/start-here"
  },
  {
    id: "storage-raid-backup", topic: "storage-raid", type: "boolean", difficulty: "foundation",
    prompt: "A healthy RAID array removes the need for independent backups.",
    options: ["True", "False"], correct: [1],
    explanation: "RAID improves availability during some disk failures. It does not protect against deletion, corruption, ransomware, controller errors, site loss, or operator mistakes.",
    objective: "Separate availability from recoverability.", guideHref: "/guides/storage-raid"
  },
  {
    id: "storage-capacity", topic: "storage-raid", type: "single", difficulty: "intermediate",
    prompt: "Four equal 4 TB drives are configured as RAID 10. Approximately how much raw usable capacity is available before formatting and filesystem overhead?",
    options: ["4 TB", "8 TB", "12 TB", "16 TB"], correct: [1],
    explanation: "RAID 10 mirrors data and stripes across mirror pairs, so usable capacity is approximately half of raw capacity: 16 TB raw becomes about 8 TB usable.",
    objective: "Estimate RAID capacity from layout.", guideHref: "/guides/storage-raid"
  },
  {
    id: "storage-zfs-replace", topic: "storage-raid", type: "scenario", difficulty: "advanced",
    prompt: "A ZFS pool reports a degraded mirror after a disk failure. What is the safest operational sequence?",
    options: ["Confirm the failed device identity, replace it, monitor resilvering, then verify pool health and data checks.", "Detach both mirror members and recreate the pool.", "Run a benchmark first to confirm performance loss.", "Delete snapshots to force the pool online."],
    correct: [0], explanation: "Device identity must be verified before replacement. Resilver progress and final pool health should be monitored, followed by validation—not assumed success.",
    objective: "Operate a degraded ZFS pool safely.", guideHref: "/guides/storage-raid"
  },
  {
    id: "pve-vm-container", topic: "proxmox", type: "single", difficulty: "foundation",
    prompt: "When is a Proxmox VM generally preferable to an LXC container?",
    options: ["When the workload needs its own kernel or stronger isolation boundary.", "When the workload must start in milliseconds.", "When disk usage must always be smallest.", "When every process should share the host kernel."],
    correct: [0], explanation: "VMs provide a separate guest kernel and a stronger isolation boundary. LXC is efficient, but containers share the host kernel.",
    objective: "Choose the correct Proxmox workload boundary.", guideHref: "/guides/proxmox"
  },
  {
    id: "pve-quorum", topic: "proxmox", type: "scenario", difficulty: "intermediate",
    prompt: "A two-node Proxmox cluster loses communication between nodes. What design most directly reduces split-brain risk?",
    options: ["Add a reliable third vote, such as a third node or properly designed qdevice.", "Disable quorum checks on both nodes.", "Give both nodes the same hostname.", "Place corosync on the public internet."],
    correct: [0], explanation: "An odd, independent vote helps establish quorum. Disabling quorum protection increases the chance of conflicting cluster state and data damage.",
    objective: "Reason about quorum and split-brain prevention.", guideHref: "/guides/proxmox"
  },
  {
    id: "pve-production-controls", topic: "proxmox", type: "multiple", difficulty: "advanced",
    prompt: "Which controls belong in a production Proxmox baseline? Select all that apply.",
    options: ["Restrict management access to an administrative network or VPN.", "Test restores from independent backups.", "Monitor storage, certificates, capacity, and backup jobs.", "Treat snapshots as the only backup copy."],
    correct: [0, 1, 2], explanation: "Management isolation, monitoring, and restore-tested independent backups are core controls. Snapshots share failure domains and are not a complete backup strategy.",
    objective: "Recognize production-grade virtualization controls.", guideHref: "/guides/proxmox"
  },
  {
    id: "net-wg-crypto", topic: "secure-networking", type: "boolean", difficulty: "foundation",
    prompt: "WireGuard identifies peers by cryptographic public keys rather than usernames and passwords.",
    options: ["True", "False"], correct: [0],
    explanation: "WireGuard peers authenticate using public keys. Identity, device ownership, key rotation, and authorization still need an operational process around those keys.",
    objective: "Understand the WireGuard trust model.", guideHref: "/guides/secure-networking"
  },
  {
    id: "net-allowed-ips", topic: "secure-networking", type: "multiple", difficulty: "intermediate",
    prompt: "In WireGuard, what roles can AllowedIPs perform? Select all that apply.",
    options: ["Select which outbound destinations use a peer.", "Define which source addresses are accepted from a peer.", "Replace DNS resolution for every application.", "Help prevent peers from claiming unauthorized tunnel addresses."],
    correct: [0, 1, 3], explanation: "AllowedIPs participates in routing and peer source-address validation. It is powerful policy plumbing, but it is not a DNS service.",
    objective: "Apply WireGuard routing and peer authorization correctly.", guideHref: "/guides/secure-networking"
  },
  {
    id: "net-egypt-path", topic: "secure-networking", type: "scenario", difficulty: "advanced",
    prompt: "A standard WireGuard tunnel is unreliable on a restrictive network, while ordinary HTTPS remains stable. What is the most responsible next step?",
    context: "The deployment must comply with applicable local law and the organization’s authorization policy.",
    options: ["Test an approved obfuscation-capable transport such as AmneziaWG, document the change, and verify reachability and kill-switch behavior.", "Expose the Proxmox management UI directly to the internet.", "Disable encryption to reduce packet overhead.", "Reuse one private key across every employee device."],
    correct: [0], explanation: "Where authorized, an obfuscation-aware tunnel may improve resilience. It must still be governed, uniquely keyed, tested, and paired with safe failure behavior.",
    objective: "Adapt private access safely under restrictive network conditions.", guideHref: "/guides/secure-networking"
  },
  {
    id: "ubuntu-lts", topic: "ubuntu", type: "single", difficulty: "foundation",
    prompt: "Why is Ubuntu LTS commonly chosen for professional development workstations?",
    options: ["It combines a long support window, broad tooling support, predictable packages, and strong cloud parity.", "It never requires security updates.", "It guarantees identical behavior to every production system.", "It can only run open-source development tools."],
    correct: [0], explanation: "Ubuntu LTS offers a stable support horizon and a large ecosystem. Teams still need patching, configuration management, and explicit parity controls.",
    objective: "Explain the operational value of an LTS workstation.", guideHref: "/guides/ubuntu"
  },
  {
    id: "ubuntu-packages", topic: "ubuntu", type: "multiple", difficulty: "intermediate",
    prompt: "Which practices improve reproducibility on a shared Ubuntu development baseline? Select all that apply.",
    options: ["Document bootstrap steps as code.", "Pin critical tool versions where compatibility matters.", "Keep project dependencies isolated in containers or language environments.", "Install every tool globally from unverified scripts."],
    correct: [0, 1, 2], explanation: "A reproducible baseline is explicit, version-aware, and isolates project dependencies. Unreviewed global installers create drift and supply-chain risk.",
    objective: "Build reproducible developer environments.", guideHref: "/guides/ubuntu"
  },
  {
    id: "ubuntu-sudo", topic: "ubuntu", type: "scenario", difficulty: "advanced",
    prompt: "A developer needs Docker access on a shared build host. Which security observation is most important?",
    options: ["Membership in the Docker group is effectively root-equivalent and must be governed accordingly.", "Docker group membership only permits reading logs.", "Containers always prevent host filesystem access.", "Rootless and rootful Docker have identical privilege boundaries."],
    correct: [0], explanation: "The Docker daemon commonly runs with root privileges, and users who control it can usually gain host-level access. Treat that membership as privileged access.",
    objective: "Recognize container tooling privilege boundaries.", guideHref: "/guides/ubuntu"
  },
  {
    id: "ssh-host-key", topic: "remote-access", type: "single", difficulty: "foundation",
    prompt: "What does an SSH host-key fingerprint help a client verify?",
    options: ["The identity of the server being contacted.", "The user’s local password strength.", "The server’s available disk capacity.", "The client’s VPN bandwidth."],
    correct: [0], explanation: "Host-key verification protects against connecting to an unexpected or impersonated server. Fingerprints should be distributed through a trusted channel.",
    objective: "Understand SSH server identity verification.", guideHref: "/guides/remote-access"
  },
  {
    id: "ssh-hardening", topic: "remote-access", type: "multiple", difficulty: "intermediate",
    prompt: "Which controls strengthen administrative SSH access? Select all that apply.",
    options: ["Use named accounts and individual keys.", "Restrict source networks or require a private VPN.", "Keep a tested recovery or console path.", "Share one administrator private key across the team."],
    correct: [0, 1, 2], explanation: "Named identity, network restriction, and recovery access improve control and accountability. Shared private keys make attribution and revocation difficult.",
    objective: "Design accountable remote administration.", guideHref: "/guides/remote-access"
  },
  {
    id: "ssh-key-warning", topic: "remote-access", type: "scenario", difficulty: "advanced",
    prompt: "SSH warns that a known host key has changed after a server rebuild. What should you do first?",
    options: ["Stop and verify the new fingerprint through a trusted channel before updating known_hosts.", "Delete the entire known_hosts file and reconnect.", "Disable strict host-key checking permanently.", "Enter the server password repeatedly until the warning disappears."],
    correct: [0], explanation: "A changed key may be expected after a rebuild—or may indicate interception. Verify it out of band before trusting the new identity.",
    objective: "Respond safely to SSH trust changes.", guideHref: "/guides/remote-access"
  },
  {
    id: "prod-observability", topic: "production", type: "multiple", difficulty: "foundation",
    prompt: "Which signals belong in a balanced observability strategy? Select all that apply.",
    options: ["Metrics", "Logs", "Traces", "User-facing availability checks"],
    correct: [0, 1, 2, 3], explanation: "No single signal tells the whole story. Metrics, logs, traces, and external checks provide complementary evidence about system and user experience.",
    objective: "Recognize complementary observability signals.", guideHref: "/guides/production"
  },
  {
    id: "prod-backup-proof", topic: "production", type: "boolean", difficulty: "intermediate",
    prompt: "A successful backup job is sufficient evidence that the service can be restored within its RTO.",
    options: ["True", "False"], correct: [1],
    explanation: "Backup completion proves that a job ran, not that data is usable or restoration is fast enough. Representative restore tests provide recovery evidence.",
    objective: "Distinguish backup completion from recovery assurance.", guideHref: "/guides/production"
  },
  {
    id: "prod-incident", topic: "production", type: "scenario", difficulty: "advanced",
    prompt: "A release causes elevated errors but dashboards still show healthy CPU and memory. What should drive the immediate response?",
    options: ["User-impact indicators, the release timeline, and the documented rollback decision path.", "Only infrastructure utilization metrics.", "Waiting for every customer to report the problem.", "Deleting logs to reduce storage pressure."],
    correct: [0], explanation: "Resource health does not equal service health. User-centered signals and a rehearsed rollback path support fast, evidence-based incident decisions.",
    objective: "Prioritize user impact during incidents.", guideHref: "/guides/production"
  },
  {
    id: "rhel-selinux", topic: "rhel", type: "single", difficulty: "foundation",
    prompt: "What is the preferred first response when SELinux blocks a newly deployed service?",
    options: ["Inspect the denial and correct labels or policy while keeping enforcing mode.", "Permanently disable SELinux.", "Make every application file world-writable.", "Run the service from a user’s home directory as root."],
    correct: [0], explanation: "SELinux denials are diagnostic evidence. Correcting file contexts, booleans, or narrowly scoped policy preserves mandatory access control.",
    objective: "Troubleshoot SELinux without removing the control.", guideHref: "/guides/rhel"
  },
  {
    id: "rhel-systemd", topic: "rhel", type: "multiple", difficulty: "intermediate",
    prompt: "Which systemd practices support reliable service operation? Select all that apply.",
    options: ["Use drop-in overrides instead of editing vendor unit files.", "Inspect journal logs and dependency state during diagnosis.", "Run systemctl daemon-reload after unit changes.", "Place passwords directly in world-readable unit files."],
    correct: [0, 1, 2], explanation: "Drop-ins preserve package-managed units, the journal provides evidence, and daemon-reload applies unit changes. Secrets require protected delivery mechanisms.",
    objective: "Operate systemd services predictably.", guideHref: "/guides/rhel"
  },
  {
    id: "rhel-podman", topic: "rhel", type: "scenario", difficulty: "advanced",
    prompt: "A team wants containers to run under a named non-root service account and survive reboots. Which approach best fits RHEL operations?",
    options: ["Use rootless Podman with a generated or managed systemd/Quadlet definition and tested persistent user services.", "Launch an interactive container manually after every reboot.", "Run all containers privileged as root.", "Disable cgroups and SELinux."],
    correct: [0], explanation: "Rootless Podman combined with declarative systemd integration provides repeatable lifecycle management without defaulting to host root privileges.",
    objective: "Design governed container services on RHEL.", guideHref: "/guides/rhel"
  },
  {
    id: "github-rules", topic: "github", type: "multiple", difficulty: "foundation",
    prompt: "Which repository rules improve change governance? Select all that apply.",
    options: ["Require pull-request review.", "Require named status checks.", "Require resolution of review conversations.", "Allow routine direct pushes to the default branch."],
    correct: [0, 1, 2], explanation: "Protected, reviewed changes with required checks and resolved conversations create an auditable control path. Direct default-branch pushes weaken it.",
    objective: "Apply repository governance controls.", guideHref: "/guides/github"
  },
  {
    id: "github-oidc", topic: "github", type: "single", difficulty: "intermediate",
    prompt: "Why is OIDC generally preferred over long-lived cloud access keys in GitHub Actions?",
    options: ["It enables short-lived, policy-scoped credentials without storing a permanent cloud secret.", "It makes workflow permissions unnecessary.", "It allows every fork to deploy to production.", "It eliminates the need for cloud-side trust configuration."],
    correct: [0], explanation: "OIDC exchanges a signed workflow identity for temporary credentials. Cloud trust conditions and minimal workflow permissions remain essential.",
    objective: "Reduce CI credential exposure with federation.", guideHref: "/guides/github"
  },
  {
    id: "github-supply-chain", topic: "github", type: "scenario", difficulty: "advanced",
    prompt: "A workflow uses third-party actions by mutable tags such as @v4. What change most directly reduces dependency substitution risk?",
    options: ["Pin third-party actions to reviewed full commit SHAs and automate controlled updates.", "Give the workflow write permission to every scope.", "Store a personal access token in the repository.", "Run pull-request code with production secrets."],
    correct: [0], explanation: "Full commit SHA pinning fixes the exact action code executed. An update process can then review and deliberately advance those pins.",
    objective: "Harden the CI software supply chain.", guideHref: "/guides/github"
  },
  {
    id: "supabase-rls", topic: "supabase", type: "boolean", difficulty: "foundation",
    prompt: "Enabling Row Level Security without creating appropriate policies can cause client queries to return no rows.",
    options: ["True", "False"], correct: [0],
    explanation: "Once RLS is enabled, access through affected roles requires policies. Policies should be tested for both allowed and denied cases.",
    objective: "Understand the default-deny effect of RLS.", guideHref: "/guides/supabase"
  },
  {
    id: "supabase-service-role", topic: "supabase", type: "single", difficulty: "intermediate",
    prompt: "Where may a Supabase service-role key be used safely?",
    options: ["Only in trusted server-side code with tightly controlled secret access.", "In public browser JavaScript for faster queries.", "Inside a mobile application bundle.", "In documentation examples committed to a public repository."],
    correct: [0], explanation: "The service-role key has elevated access and can bypass RLS. It must never be exposed to untrusted clients.",
    objective: "Protect privileged Supabase credentials.", guideHref: "/guides/supabase"
  },
  {
    id: "supabase-policy", topic: "supabase", type: "scenario", difficulty: "advanced",
    prompt: "Users should read only rows where owner_id equals their authenticated user ID. What is the strongest primary control?",
    options: ["A tested RLS SELECT policy comparing owner_id with auth.uid().", "A hidden button in the frontend.", "A client-side filter after downloading all rows.", "A database view exposed with unrestricted grants."],
    correct: [0], explanation: "Authorization must be enforced at the data boundary. UI hiding and client filtering are presentation choices, not security controls.",
    objective: "Enforce tenant authorization in Postgres.", guideHref: "/guides/supabase"
  },
  {
    id: "vercel-preview", topic: "vercel", type: "single", difficulty: "foundation",
    prompt: "What is the main operational value of a Vercel preview deployment?",
    options: ["It creates an isolated, reviewable deployment for a specific change before production promotion.", "It automatically proves the application has no defects.", "It shares all production data and secrets by default.", "It replaces source-control review."],
    correct: [0], explanation: "Preview deployments make a concrete change testable by reviewers. They still need environment isolation, appropriate protection, and quality checks.",
    objective: "Use previews as part of a controlled delivery path.", guideHref: "/guides/vercel"
  },
  {
    id: "vercel-env", topic: "vercel", type: "multiple", difficulty: "intermediate",
    prompt: "Which practices improve Vercel environment safety? Select all that apply.",
    options: ["Use separate values for development, preview, and production.", "Scope sensitive variables only to environments that require them.", "Rotate a credential after suspected exposure.", "Expose private server credentials with a public client prefix."],
    correct: [0, 1, 2], explanation: "Environment separation and least exposure limit blast radius. Publicly exposed variables must never contain server-only secrets.",
    objective: "Manage deployment configuration safely.", guideHref: "/guides/vercel"
  },
  {
    id: "vercel-rollback", topic: "vercel", type: "scenario", difficulty: "advanced",
    prompt: "A production deployment introduces a severe regression. What is the best immediate delivery response?",
    options: ["Promote a known-good deployment or roll back through the controlled deployment path, then investigate with evidence preserved.", "Edit generated production files manually.", "Delete the Git repository.", "Disable monitoring until the errors stop."],
    correct: [0], explanation: "A known-good immutable deployment provides a fast, auditable recovery path. Preserve logs and deployment evidence for the follow-up investigation.",
    objective: "Recover safely from a bad deployment.", guideHref: "/guides/vercel"
  },
  {
    id: "platform-iac", topic: "platform-engineering", type: "boolean", difficulty: "foundation",
    prompt: "Infrastructure as code is valuable only when provisioning brand-new environments.",
    options: ["True", "False"], correct: [1],
    explanation: "IaC also supports review, repeatability, disaster recovery, drift detection, and controlled evolution of existing environments.",
    objective: "Recognize the full operational value of IaC.", guideHref: "/guides/platform-engineering"
  },
  {
    id: "platform-secrets", topic: "platform-engineering", type: "multiple", difficulty: "intermediate",
    prompt: "Which are sound secrets-management practices? Select all that apply.",
    options: ["Prefer short-lived credentials where supported.", "Centralize access control and audit events.", "Rotate credentials and test revocation.", "Commit encrypted and plaintext secrets together for convenience."],
    correct: [0, 1, 2], explanation: "Short lifetimes, controlled issuance, auditing, rotation, and revocation reduce exposure. Source repositories should not contain plaintext secrets.",
    objective: "Design a manageable secrets lifecycle.", guideHref: "/guides/platform-engineering"
  },
  {
    id: "platform-slo", topic: "platform-engineering", type: "scenario", difficulty: "advanced",
    prompt: "A platform team receives frequent alerts that do not correlate with user impact. What is the best improvement?",
    options: ["Define user-centered SLIs and SLOs, then alert on actionable burn-rate or symptom thresholds with clear ownership.", "Lower every threshold until more alerts fire.", "Page all engineers for every log warning.", "Remove observability to reduce noise."],
    correct: [0], explanation: "SLO-based, symptom-oriented alerting connects response to user impact. Clear ownership and runbooks turn alerts into actionable work.",
    objective: "Build actionable reliability signals.", guideHref: "/guides/platform-engineering"
  }
];

export function isCorrectAnswer(question: ExamQuestion, answer: number[]) {
  if (answer.length !== question.correct.length) return false;
  const selected = [...answer].sort((a, b) => a - b);
  const correct = [...question.correct].sort((a, b) => a - b);
  return selected.every((value, index) => value === correct[index]);
}
