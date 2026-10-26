import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Difficulty } from "../generated/prisma/client";
import { additionalArticles, additionalSections } from "./additional-content";

config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const verified = new Date("2026-10-26T00:00:00.000Z");
const md = (...lines: string[]) => lines.join("\n");

const sections = [
  { slug: "start-here", title: "Start here", summary: "Understand the complete platform before touching a disk or opening a firewall.", icon: "Compass", order: 1 },
  { slug: "storage-raid", title: "Storage & RAID", summary: "Design resilient storage around workload, recovery, and failure domains.", icon: "HardDrive", order: 2 },
  { slug: "proxmox", title: "Proxmox VE", summary: "Build a repeatable virtualization platform from installation to production operations.", icon: "Server", order: 3 },
  { slug: "secure-networking", title: "Secure networking", summary: "Connect teams safely with WireGuard and AmneziaWG-aware deployment patterns.", icon: "Shield", order: 4 },
  { slug: "ubuntu", title: "Ubuntu workspace", summary: "Create a stable development environment with production-like tooling.", icon: "Terminal", order: 5 },
  { slug: "remote-access", title: "Remote access", summary: "Reach Ubuntu securely from Windows, macOS, Linux, Android, and iOS.", icon: "Network", order: 6 },
  { slug: "production", title: "Production readiness", summary: "Turn a working lab into an observable, recoverable operating platform.", icon: "BadgeCheck", order: 7 },
  ...additionalSections
];

const articles = [
  {
    section: "start-here", slug: "reference-architecture", title: "The infrastructure journey", description: "See how disks, virtualization, secure access, and developer workspaces fit together.", difficulty: Difficulty.FOUNDATION, minutes: 7, order: 1,
    body: md(
      "## One platform, connected decisions",
      "A dependable DevOps platform is a chain. Physical infrastructure supports compute, operating systems enforce host policy, GitHub governs change, Supabase manages application data, Vercel releases services, and observability closes the feedback loop. A weak decision at any layer can invalidate the work above it.",
      "",
      "> **Operating principle:** design recovery before convenience. Document how to rebuild every layer before calling it production-ready.",
      "",
      "### Reference flow",
      "1. **Disks and backups** — choose a failure-tolerant layout and a separate backup target.",
      "2. **Proxmox host** — isolate the management plane and keep the hypervisor focused on virtualization.",
      "3. **VMs and containers** — use VMs for strong isolation and LXC for trusted lightweight services.",
      "4. **Private access** — enter through a VPN before using SSH, RDP, VNC, or the Proxmox UI.",
      "5. **Ubuntu workspaces** — standardize tooling with repeatable bootstrap scripts and Cloud-Init.",
      "6. **Enterprise Linux** — use RHEL lifecycle, SELinux, Podman, and System Roles where support and policy matter.",
      "7. **Software control plane** — protect source and CI/CD with GitHub rulesets, OIDC, and supply-chain evidence.",
      "8. **Application platform** — secure Supabase at the PostgreSQL boundary and release through isolated Vercel environments.",
      "9. **Platform operations** — manage infrastructure as code, telemetry, SLOs, secrets, and recovery exercises.",
      "",
      "### Choose your profile",
      "| Profile | Host design | Storage | Availability goal |",
      "|---|---|---|---|",
      "| Lab | One host | Mirror plus external backup | Learn and rebuild |",
      "| Small team | One or two hosts | Mirrored SSDs, dedicated backup server | Fast recovery |",
      "| Production | Three or more nodes | Shared or replicated storage | Quorum, HA, tested recovery |",
      "",
      "## Safety conventions",
      "Commands in this guide use placeholders such as `<interface>` and `<server-ip>`. Replace them deliberately. Disk commands can destroy data; confirm device identity with `lsblk -o NAME,SIZE,MODEL,SERIAL,FSTYPE,MOUNTPOINTS` and maintain a verified backup before changing partitions, RAID, or ZFS."
    )
  },
  {
    section: "storage-raid", slug: "choose-raid", title: "Choose the right RAID layout", description: "Compare RAID levels by failure tolerance, write behavior, capacity, and rebuild risk.", difficulty: Difficulty.FOUNDATION, minutes: 11, order: 1,
    body: md(
      "## RAID protects uptime—not history",
      "RAID can keep a service online when a disk fails. It does not recover a deleted VM, a corrupted database, ransomware-encrypted files, or a destroyed server. Use RAID together with independent, versioned, restore-tested backups.",
      "",
      "| Layout | Minimum disks | Approx. usable capacity | Failure tolerance | Best fit |",
      "|---|---:|---:|---|---|",
      "| RAID 0 | 2 | 100% | None | Disposable cache only |",
      "| RAID 1 | 2 | 50% | One disk | Boot and small reliable volumes |",
      "| RAID 5 | 3 | N−1 disks | One disk | Capacity-focused, moderate workloads |",
      "| RAID 6 | 4 | N−2 disks | Two disks | Large arrays and archive targets |",
      "| RAID 10 | 4 | 50% | One per mirror pair | VM and database random I/O |",
      "",
      "> **Decision rule:** there is no universal best RAID. For busy VM storage, mirrors or RAID 10 usually provide predictable latency and simpler rebuild behavior. For large sequential capacity, double parity may be more important than write speed.",
      "",
      "## Ask these questions first",
      "- How many simultaneous disk failures must the service tolerate?",
      "- Is the workload random I/O, sequential archive, or mostly reads?",
      "- How long will a full rebuild take at real production load?",
      "- Can the service be restored elsewhere if the entire array is lost?",
      "- Are controller, enclosure, power, and operator mistakes separate failure domains?",
      "",
      "## Validate the design",
      "Document drive model, capacity, firmware, slot, serial number, hot-spare policy, alert destination, replacement procedure, and the most recent restore test. Schedule SMART tests and array scrubs appropriate to the technology."
    )
  },
  {
    section: "storage-raid", slug: "mdadm-zfs", title: "Build with mdadm or ZFS", description: "Safe implementation patterns for Linux software RAID and Proxmox-native ZFS.", difficulty: Difficulty.ADVANCED, minutes: 15, order: 2,
    body: md(
      "## Pick one owner for redundancy",
      "Use `mdadm` when you want conventional Linux block RAID beneath a filesystem. Use ZFS when you want storage pooling, checksums, snapshots, compression, and integrated redundancy. Avoid placing ZFS on top of a hardware RAID virtual disk because ZFS needs direct visibility into individual drives.",
      "",
      "> **Destructive operation:** the examples below erase member disks. Replace placeholder devices only after matching their model and serial numbers. Never paste these commands into a production host without a backup and rollback plan.",
      "",
      "### Inspect candidate disks",
      "```bash",
      "lsblk -o NAME,SIZE,MODEL,SERIAL,FSTYPE,MOUNTPOINTS",
      "sudo smartctl -a /dev/<disk>",
      "```",
      "",
      "### Create an mdadm RAID 1 mirror",
      "```bash",
      "sudo apt update && sudo apt install -y mdadm smartmontools",
      "sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/<disk-a> /dev/<disk-b>",
      "watch cat /proc/mdstat",
      "sudo mdadm --detail /dev/md0",
      "```",
      "Persist the array definition with `sudo mdadm --detail --scan`, then create a filesystem, mount by UUID, and test a reboot during a maintenance window.",
      "",
      "### Create a ZFS mirror",
      "```bash",
      "sudo zpool create -o ashift=12 tank mirror /dev/disk/by-id/<disk-a> /dev/disk/by-id/<disk-b>",
      "sudo zfs set compression=lz4 tank",
      "sudo zpool status -v tank",
      "```",
      "Use stable `/dev/disk/by-id/` paths. Monitor `zpool status`, run scheduled scrubs, and replace a failed device with `zpool replace`. Snapshots are useful rollback points but are not independent backups when they live in the same pool."
    )
  },
  {
    section: "proxmox", slug: "install-proxmox", title: "Install Proxmox VE safely", description: "Prepare hardware, install the hypervisor, and complete a secure first login.", difficulty: Difficulty.INTERMEDIATE, minutes: 14, order: 1,
    body: md(
      "## Before the installer",
      "Confirm 64-bit virtualization support, enable Intel VT-x/AMD-V, and enable IOMMU only if passthrough is planned. Update system firmware, record NIC MAC addresses, test memory, and decide the management IP, DNS name, gateway, storage layout, and recovery path before booting installation media.",
      "",
      "### Installation sequence",
      "1. Download the ISO from the official Proxmox download page and verify its checksum.",
      "2. Write the image with a trusted tool and boot in UEFI mode.",
      "3. Select the target storage deliberately. For ZFS, choose the topology that matches the physical disks.",
      "4. Set locale and timezone, then use a unique administrative password and a monitored email address.",
      "5. Assign a static management IP and resolvable fully qualified domain name.",
      "6. Reboot, remove the installer, and open `https://<management-ip>:8006` from the administrative network.",
      "",
      "> **Security note:** a self-signed certificate warning is expected at first login. Verify the address and certificate fingerprint out of band; do not train administrators to click through arbitrary certificate warnings.",
      "",
      "## First-day checklist",
      "- Apply supported updates and confirm repository configuration for your subscription status.",
      "- Create named administrators with least-privilege roles and MFA.",
      "- Configure time synchronization, alerting, and certificate management.",
      "- Restrict ports 8006 and 22 to the management network or private VPN.",
      "- Add a backup target and complete a restore test before onboarding critical VMs.",
      "",
      "Do not assume a version number from this guide. Check the installed release with `pveversion -v`, then follow the official documentation for that release."
    )
  },
  {
    section: "proxmox", slug: "vm-cloud-init", title: "Create an Ubuntu Cloud-Init template", description: "Turn a verified Ubuntu cloud image into repeatable Proxmox virtual machines.", difficulty: Difficulty.INTERMEDIATE, minutes: 12, order: 2,
    body: md(
      "## Why templates beat manual installs",
      "A Cloud-Init template makes identity, SSH keys, networking, and packages declarative. Each clone begins from the same reviewed image and can be recreated by automation.",
      "",
      "### Template workflow",
      "```bash",
      "qm create 9000 --name ubuntu-lts-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0",
      "qm importdisk 9000 /var/lib/vz/template/iso/<ubuntu-cloud-image>.img local-lvm",
      "qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0",
      "qm set 9000 --ide2 local-lvm:cloudinit --boot order=scsi0",
      "qm set 9000 --serial0 socket --vga serial0 --agent enabled=1",
      "```",
      "",
      "Configure a non-root user, an SSH public key, DNS, and either DHCP or a reviewed static address in the Cloud-Init panel. Start a test clone before converting the source to a template. Confirm console access, network, DNS, package updates, time sync, disk growth, and QEMU guest-agent reporting.",
      "",
      "### VM or LXC?",
      "Use a VM when tenants are not mutually trusted, a different kernel is required, or isolation is the priority. Use an unprivileged LXC container for trusted, lightweight Linux services where density and startup speed matter. Do not treat a container boundary as equivalent to a VM boundary."
    )
  },
  {
    section: "proxmox", slug: "network-backup-ha", title: "Networks, backups, and high availability", description: "Separate traffic, prove recovery, and understand the real prerequisites for HA.", difficulty: Difficulty.ADVANCED, minutes: 15, order: 3,
    body: md(
      "## Separate the planes",
      "At minimum, distinguish management, guest, storage, migration, and backup traffic. A Linux bridge behaves like a virtual switch. VLAN-aware bridges can carry several tagged networks, while bonds provide link redundancy when the physical switch is configured to match.",
      "",
      "```text",
      "auto vmbr0",
      "iface vmbr0 inet static",
      "    address 10.20.0.11/24",
      "    gateway 10.20.0.1",
      "    bridge-ports bond0",
      "    bridge-stp off",
      "    bridge-fd 0",
      "    bridge-vlan-aware yes",
      "```",
      "",
      "> **Common failure:** changing the management bridge remotely can disconnect the host. Use console or out-of-band management, validate interface names, and prepare a timed rollback.",
      "",
      "## Backup before HA",
      "Proxmox Backup Server provides incremental, deduplicated backups and granular restore features. Keep backup credentials separate, protect encryption keys outside the cluster, monitor every job, and perform isolated restore drills.",
      "",
      "HA needs quorum, compatible nodes, fencing behavior, and storage accessible after a node failure. Three voting nodes are the normal baseline; a two-node design needs an independent QDevice. HA restarts workloads—it does not repair corrupt data or replace backups."
    )
  },
  {
    section: "secure-networking", slug: "wireguard", title: "Deploy WireGuard for private access", description: "Build a small, auditable VPN and validate routing, DNS, NAT, and peer isolation.", difficulty: Difficulty.INTERMEDIATE, minutes: 16, order: 1,
    body: md(
      "## Model the tunnel first",
      "WireGuard connects peers with public keys and explicit routes. Decide whether clients need only private subnets (split tunnel) or all internet traffic through the VPN (full tunnel). Allocate a dedicated tunnel subnet that does not overlap home, office, cloud, or container networks.",
      "",
      "### Install and generate server keys",
      "```bash",
      "sudo apt update && sudo apt install -y wireguard",
      "umask 077",
      "wg genkey | tee server.key | wg pubkey > server.pub",
      "```",
      "Store private keys with mode `600`. Never paste them into tickets or source control.",
      "",
      "### Minimal server shape",
      "```ini",
      "[Interface]",
      "Address = 10.70.0.1/24",
      "ListenPort = <udp-port>",
      "PrivateKey = <server-private-key>",
      "",
      "[Peer]",
      "PublicKey = <client-public-key>",
      "AllowedIPs = 10.70.0.2/32",
      "```",
      "Enable forwarding only when clients must reach another network. Add narrow firewall and NAT rules for the intended interface and subnet; avoid copying interface names blindly.",
      "",
      "### Validate",
      "Use `sudo wg show`, `ip route`, `ss -lunp`, and targeted pings. A recent handshake with no traffic usually points to AllowedIPs, forwarding, NAT, MTU, or a downstream firewall. Generate one keypair per device so access can be revoked independently."
    )
  },
  {
    section: "secure-networking", slug: "amneziawg-egypt", title: "AmneziaWG and Egypt deployment notes", description: "Plan resilient remote access where WireGuard traffic may be filtered or unreliable.", difficulty: Difficulty.ADVANCED, minutes: 13, order: 2,
    body: md(
      "## Start with a measured problem",
      "Connectivity can vary by ISP, access network, location, and time. First prove that ordinary routing, keys, firewall rules, NAT, DNS, and MTU are correct. Compare from more than one network before concluding that protocol fingerprinting is the cause.",
      "",
      "AmneziaWG retains WireGuard's core design while changing observable transport characteristics. It can be useful where standard WireGuard traffic is disrupted, but it adds operational complexity and no configuration can guarantee continued connectivity.",
      "",
      "> **Legal and policy notice:** use VPN technology only where lawful and authorized. Organizations should review Egyptian law, contractual obligations, data-handling rules, and internal policy with qualified counsel. This guide is technical information, not legal advice.",
      "",
      "## Safer deployment workflow",
      "1. Use a dedicated, patched Ubuntu LTS server from a reputable provider.",
      "2. Follow official Amnezia documentation and pin a reviewed release.",
      "3. Prefer signed packages or reproducible installation steps.",
      "4. If a community script is considered, download it without executing it, inspect every command, verify its checksum and release provenance, and test it on a disposable host.",
      "5. Export one client profile per device and protect QR codes as secrets.",
      "6. Keep a console-access recovery path and document rollback.",
      "",
      "## Troubleshooting order",
      "Check name resolution → UDP reachability → handshake timestamp → tunnel routes → forwarding/NAT → firewall counters → MTU → behavior from a second ISP. Record evidence rather than repeatedly changing several parameters at once."
    )
  },
  {
    section: "ubuntu", slug: "why-ubuntu", title: "Choose an Ubuntu development profile", description: "Use Ubuntu where ecosystem fit and production parity matter—without pretending one OS fits everyone.", difficulty: Difficulty.FOUNDATION, minutes: 8, order: 1,
    body: md(
      "## Why teams often standardize on Ubuntu",
      "Ubuntu LTS offers a predictable support window, extensive package availability, strong cloud-image support, and broad documentation. It aligns well with Linux production environments and common container tooling.",
      "",
      "Ubuntu is not objectively best for every developer. macOS is strong for Apple-platform work; Windows with WSL supports Windows-only tooling alongside Linux; Debian favors conservatism; Fedora surfaces newer Linux technologies. Choose based on production parity, hardware, support policy, required applications, and team skills.",
      "",
      "| Need | Recommended profile |",
      "|---|---|",
      "| Headless VM, CI runner, service host | Ubuntu Server LTS |",
      "| Dedicated Linux workstation | Ubuntu Desktop LTS |",
      "| Windows applications plus Linux CLI | Windows with WSL 2 |",
      "| Apple/iOS development | macOS, with remote Linux workspace |",
      "",
      "Standardization should define the supported release, update channel, bootstrap process, security baseline, backup method, and exception process—not just the distribution name."
    )
  },
  {
    section: "ubuntu", slug: "developer-bootstrap", title: "Bootstrap the developer workstation", description: "Install a secure baseline, containers, editors, and language tooling without creating configuration drift.", difficulty: Difficulty.INTERMEDIATE, minutes: 14, order: 2,
    body: md(
      "## Build the smallest useful baseline",
      "Start with OS updates, encryption, a named non-root user, SSH, firewall policy, time synchronization, and backups. Add development tools in modules so each team can reproduce the same machine without an unreviewed all-in-one script.",
      "",
      "```bash",
      "sudo apt update",
      "sudo apt install -y build-essential git curl wget ca-certificates gnupg jq unzip htop",
      "git --version",
      "```",
      "",
      "Install Docker Engine from Docker's official Ubuntu repository and verify the repository fingerprint against current official instructions. Membership in the `docker` group is effectively root-level access; document that tradeoff instead of treating it as harmless convenience.",
      "",
      "Use language-specific version managers where projects require different runtimes. Pin tool versions in project files, keep secrets outside shell history and repositories, and prefer short-lived credentials. For remote workspaces, install only the SSH server and tools actually needed.",
      "",
      "### Validation",
      "Confirm updates, reboot requirements, disk encryption, firewall status, SSH key login, backup completion, Git identity, container execution, and the project's test suite. A bootstrap is complete only when it can be run twice without damaging an existing workstation."
    )
  },
  {
    section: "remote-access", slug: "connect-everywhere", title: "Connect from every major operating system", description: "Use SSH first, then add remote desktop only when the work truly needs it.", difficulty: Difficulty.FOUNDATION, minutes: 12, order: 1,
    body: md(
      "## The safe access pattern",
      "Connect to the private VPN first, then use SSH, RDP, or VNC over the tunnel. Never forward RDP 3389, VNC 5900+, the Proxmox UI 8006, or PostgreSQL 5432 directly from a public router.",
      "",
      "### Prepare Ubuntu for SSH",
      "```bash",
      "sudo apt update && sudo apt install -y openssh-server",
      "sudo systemctl enable --now ssh",
      "sudo ss -ltnp | grep ':22'",
      "```",
      "Allow SSH only from the VPN subnet in the host firewall. Test key login in a second session before disabling passwords.",
      "",
      "### Client choices",
      "| Client | Terminal | Full desktop | Coding |",
      "|---|---|---|---|",
      "| Windows | Built-in OpenSSH | Windows App / RDP client | VS Code Remote SSH |",
      "| macOS | Built-in `ssh` | Windows App or VNC client | VS Code Remote SSH |",
      "| Linux | OpenSSH | Remmina | VS Code Remote SSH |",
      "| Android/iOS | Trusted SSH app | RDP/VNC app | Browser or SSH workflow |",
      "",
      "### Useful SSH profile",
      "```sshconfig",
      "Host devbox",
      "    HostName 10.70.0.10",
      "    User <username>",
      "    IdentityFile ~/.ssh/devbox_ed25519",
      "    IdentitiesOnly yes",
      "```",
      "",
      "Use RDP for a persistent graphical session. Treat VNC as a controlled fallback and tunnel it through the VPN or SSH. For most development, Remote SSH is faster and reduces desktop-session attack surface."
    )
  },
  {
    section: "production", slug: "readiness", title: "Production readiness review", description: "Verify security, recovery, observability, and ownership before critical workloads arrive.", difficulty: Difficulty.INTERMEDIATE, minutes: 10, order: 1,
    body: md(
      "## A working system is not yet an operated system",
      "Production readiness means the team can detect failure, contain impact, restore service, and explain ownership under pressure. Complete the interactive checklist in this guide and attach evidence to your internal change record.",
      "",
      "### Recovery",
      "Use the 3-2-1-1-0 model: three copies, two media or storage systems, one offsite copy, one offline or immutable copy, and zero uncorrected errors after verification. Define RPO and RTO per service and prove them with restore drills.",
      "",
      "### Operations cadence",
      "- Daily: review critical alerts and failed jobs.",
      "- Weekly: verify backups, capacity trends, and security updates.",
      "- Monthly: patch hosts in a maintenance window, scrub storage, review privileged access, and test alert routing.",
      "- Quarterly: restore a representative workload, review runbooks, rotate selected credentials, and conduct an incident exercise.",
      "",
      "Every control needs an owner, evidence, and a review date. Monitoring without an escalation path is only data collection. Backups without restore tests are assumptions."
    )
  },
  ...additionalArticles
];

const sourceRows = [
  { title: "Proxmox VE Administration Guide", organization: "Proxmox Server Solutions", url: "https://pve.proxmox.com/pve-docs/pve-admin-guide.html", sourceType: "official documentation", sections: ["start-here", "storage-raid", "proxmox", "production"] },
  { title: "Ubuntu Server documentation", organization: "Canonical", url: "https://documentation.ubuntu.com/server/", sourceType: "official documentation", sections: ["start-here", "ubuntu", "remote-access", "production"] },
  { title: "WireGuard Quick Start", organization: "WireGuard", url: "https://www.wireguard.com/quickstart/", sourceType: "official documentation", sections: ["secure-networking", "remote-access"] },
  { title: "Amnezia documentation", organization: "Amnezia", url: "https://docs.amnezia.org/", sourceType: "official documentation", sections: ["secure-networking", "remote-access"] },
  { title: "OpenZFS documentation", organization: "OpenZFS", url: "https://openzfs.github.io/openzfs-docs/", sourceType: "official documentation", sections: ["storage-raid", "proxmox", "production"] },
  { title: "Docker Engine on Ubuntu", organization: "Docker", url: "https://docs.docker.com/engine/install/ubuntu/", sourceType: "official documentation", sections: ["ubuntu", "platform-engineering"] },
  { title: "Red Hat Enterprise Linux 10 documentation", organization: "Red Hat", url: "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10", sourceType: "official documentation", sections: ["rhel"] },
  { title: "Red Hat Enterprise Linux life cycle", organization: "Red Hat", url: "https://access.redhat.com/support/policy/updates/errata", sourceType: "official lifecycle policy", sections: ["rhel"] },
  { title: "GitHub Actions secure use reference", organization: "GitHub", url: "https://docs.github.com/en/actions/reference/security/secure-use", sourceType: "official documentation", sections: ["github", "platform-engineering"] },
  { title: "About repository rulesets", organization: "GitHub", url: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets", sourceType: "official documentation", sections: ["github"] },
  { title: "Supabase documentation", organization: "Supabase", url: "https://supabase.com/docs", sourceType: "official documentation", sections: ["supabase"] },
  { title: "Supabase changelog", organization: "Supabase", url: "https://supabase.com/changelog", sourceType: "official changelog", sections: ["supabase"] },
  { title: "Vercel documentation", organization: "Vercel", url: "https://vercel.com/docs", sourceType: "official documentation", sections: ["vercel"] },
  { title: "Vercel production checklist", organization: "Vercel", url: "https://vercel.com/docs/production-checklist", sourceType: "official documentation", sections: ["vercel", "platform-engineering"] },
  { title: "Kubernetes documentation", organization: "Cloud Native Computing Foundation", url: "https://kubernetes.io/docs/home/", sourceType: "official documentation", sections: ["platform-engineering"] },
  { title: "OpenTelemetry documentation", organization: "Cloud Native Computing Foundation", url: "https://opentelemetry.io/docs/", sourceType: "official documentation", sections: ["platform-engineering"] }
];

const glossary = [
  ["RAID", "A method of combining disks to improve availability, performance, or capacity. RAID does not replace backups."],
  ["ZFS", "A storage system combining volume management, checksummed filesystems, snapshots, and software-defined redundancy."],
  ["KVM", "The Linux kernel virtualization technology used by Proxmox VE for full virtual machines."],
  ["LXC", "Operating-system-level containers that share the host Linux kernel."],
  ["Cloud-Init", "A standard for applying instance identity, users, keys, networking, and startup configuration on first boot."],
  ["Linux bridge", "A software switch that connects virtual interfaces to each other or to a physical network."],
  ["VLAN", "A tagged logical network used to separate traffic on shared switching infrastructure."],
  ["WireGuard", "A compact VPN protocol that connects authenticated peers using public keys and explicit routes."],
  ["DPI", "Deep packet inspection: network traffic analysis beyond basic source, destination, and port fields."],
  ["SSH", "Secure Shell, the preferred encrypted terminal and automation protocol for Linux administration."],
  ["RDP", "Remote Desktop Protocol, used for interactive graphical desktop sessions."],
  ["RPO", "Recovery point objective: the maximum acceptable amount of data loss measured in time."],
  ["RTO", "Recovery time objective: the target duration for restoring a service after an incident."],
  ["SELinux", "A mandatory access-control system that confines processes and protects resources beyond standard Unix permissions."],
  ["Podman", "A daemonless container engine with strong support for rootless containers and systemd integration."],
  ["RLS", "PostgreSQL Row Level Security: policies evaluated by the database to restrict which rows a role may access or change."],
  ["OIDC", "OpenID Connect; commonly used by CI workloads to exchange a short-lived identity for scoped cloud credentials."],
  ["SBOM", "Software bill of materials: a machine-readable inventory of components included in a software artifact."],
  ["Fluid Compute", "Vercel's compute model that reuses function instances across concurrent requests and bills active CPU separately from provisioned memory."],
  ["SLO", "Service-level objective: a reliability target measured with a user-relevant service-level indicator."],
  ["Error budget", "The amount of unreliability permitted by an SLO over a defined measurement window."],
  ["Golden path", "A supported, reusable route for creating and operating a service with approved defaults and controls."]
];

async function main() {
  const sectionMap = new Map<string, string>();
  for (const section of sections) {
    const row = await prisma.section.upsert({
      where: { slug: section.slug },
      update: section,
      create: section
    });
    sectionMap.set(section.slug, row.id);
  }

  const articleMap = new Map<string, string>();
  for (const article of articles) {
    const sectionId = sectionMap.get(article.section)!;
    const data = {
      sectionId,
      slug: article.slug,
      title: article.title,
      description: article.description,
      body: article.body,
      difficulty: article.difficulty,
      readingMinutes: article.minutes,
      order: article.order,
      status: "PUBLISHED" as const,
      publishedAt: verified,
      lastVerifiedAt: verified
    };
    const row = await prisma.article.upsert({
      where: { sectionId_slug: { sectionId, slug: article.slug } },
      update: data,
      create: data
    });
    articleMap.set(`${article.section}/${article.slug}`, row.id);
    await prisma.articleVersion.upsert({
      where: { articleId_revision: { articleId: row.id, revision: 1 } },
      update: { body: article.body, changeSummary: "Initial consolidated edition" },
      create: { articleId: row.id, revision: 1, body: article.body, changeSummary: "Initial consolidated edition" }
    });
  }

  const createdSources: Array<{ row: Awaited<ReturnType<typeof prisma.source.upsert>>; sections: string[] }> = [];
  for (const sourceWithSections of sourceRows) {
    const { sections: sourceSections, ...source } = sourceWithSections;
    const row = await prisma.source.upsert({
      where: { url: source.url },
      update: { ...source, lastVerifiedAt: verified },
      create: { ...source, lastVerifiedAt: verified }
    });
    createdSources.push({ row, sections: sourceSections });
  }

  await prisma.articleSource.deleteMany();
  for (const [articleKey, articleId] of articleMap.entries()) {
    const sectionSlug = articleKey.split("/")[0];
    for (const source of createdSources.filter((item) => item.sections.includes(sectionSlug))) {
      await prisma.articleSource.upsert({
        where: { articleId_sourceId: { articleId, sourceId: source.row.id } },
        update: {},
        create: { articleId, sourceId: source.row.id }
      });
    }
  }

  const related = articleMap.get("start-here/reference-architecture");
  for (const [term, definition] of glossary) {
    await prisma.glossaryTerm.upsert({
      where: { term },
      update: { definition, relatedArticleId: related },
      create: { term, definition, relatedArticleId: related }
    });
  }

  console.log(`Seeded ${sections.length} sections, ${articles.length} articles, ${sourceRows.length} sources, and ${glossary.length} glossary terms.`);
}

main().finally(async () => prisma.$disconnect());
