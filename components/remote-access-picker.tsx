"use client";

import { useState } from "react";
import { Terminal, Monitor, Smartphone, Lock, AlertTriangle } from "lucide-react";

type Need = "terminal" | "desktop" | "browser-only" | "low-latency";
type HostOs = "windows" | "linux" | "macos" | "mixed";
type ClientInstall = "yes" | "no";

interface RemoteResult {
  name: string;
  label: string;
  description: string;
  steps: string[];
  icon: React.ElementType;
  color: string;
  warning?: string;
}

const REMOTE_TABLE: Record<string, RemoteResult> = {
  ssh: {
    name: "SSH",
    label: "Terminal access (preferred default)",
    description:
      "Encrypted command-line access. The simplest and most secure option for editing files, running scripts, and managing servers.",
    steps: [
      "Install OpenSSH server on the host (`sudo apt install openssh-server`).",
      "Connect from client: `ssh username@host-ip`.",
      "For internet access, connect to your VPN first, then SSH to the VPN-assigned IP.",
    ],
    icon: Terminal,
    color: "var(--accent)",
  },
  rdp: {
    name: "RDP (Windows App)",
    label: "Native Windows remote desktop",
    description:
      "Full graphical desktop for Windows hosts. Use Windows App (macOS, iOS, Android) or built-in `mstsc` (Windows). Always tunnel through VPN.",
    steps: [
      "Enable Remote Desktop on the Windows host (Settings → System → Remote Desktop).",
      "Install Windows App on macOS/iOS/Android, or use `mstsc` on Windows.",
      "Connect to the host's VPN IP on port 3389.",
    ],
    icon: Monitor,
    color: "var(--accent)",
    warning: "Never expose RDP 3389 directly to the public internet.",
  },
  guacamole: {
    name: "Apache Guacamole",
    label: "Clientless browser gateway",
    description:
      "HTML5 gateway that brokers RDP, VNC, and SSH through a browser. No client installation on the user's device.",
    steps: [
      "Deploy Guacamole gateway (Docker Compose with guacd + database).",
      "Configure connections in the Guacamole web UI (RDP → Windows, VNC → Linux, SSH → servers).",
      "Users open the gateway URL in any browser — no install needed.",
    ],
    icon: Smartphone,
    color: "var(--accent-2)",
  },
  rustdesk: {
    name: "RustDesk",
    label: "Self-hosted remote desktop",
    description:
      "Open-source TeamViewer alternative. Self-host the ID server and relay. Works across Windows, macOS, Linux, Android, iOS.",
    steps: [
      "Deploy RustDesk Server OSS with Docker (`wget rustdesk.com/oss.yml -O compose.yml`).",
      "Open TCP 21114–21119 and UDP 21116 on the server.",
      "Install RustDesk client on every device, enter the ID server and public key.",
      "Connect by peer ID — no port forwarding on the host network.",
    ],
    icon: Monitor,
    color: "var(--accent)",
  },
  sunshine: {
    name: "Sunshine + Moonlight",
    label: "GPU-accelerated streaming",
    description:
      "Sunshine (host) captures and encodes the desktop with GPU hardware acceleration; Moonlight (client) decodes with minimal latency.",
    steps: [
      "Install Sunshine on the host (Windows, Linux, macOS).",
      "Set credentials and pair in the Sunshine web UI.",
      "Install Moonlight on the client, pair with the PIN.",
      "Use the built-in "Desktop" entry to stream the full screen.",
    ],
    icon: Smartphone,
    color: "var(--accent)",
    warning: "Do not expose the Sunshine web UI to the internet without a reverse proxy and authentication.",
  },
};

function recommend(need: Need, host: HostOs, install: ClientInstall): RemoteResult {
  if (need === "terminal") return REMOTE_TABLE["ssh"];
  if (need === "browser-only" || install === "no") return REMOTE_TABLE["guacamole"];
  if (need === "low-latency") return REMOTE_TABLE["sunshine"];
  if (host === "windows") return REMOTE_TABLE["rdp"];
  return REMOTE_TABLE["rustdesk"];
}

export function RemoteAccessPicker() {
  const [need, setNeed] = useState<Need>("desktop");
  const [host, setHost] = useState<HostOs>("mixed");
  const [install, setInstall] = useState<ClientInstall>("yes");
  const result = recommend(need, host, install);

  return (
    <section className="widget-card">
      <div className="widget-header">
        <Lock className="widget-icon" />
        <h3 className="widget-title">Remote Access Tool Picker</h3>
      </div>
      <p className="widget-subtitle">
        SSH first, then remote desktop only when the work truly needs it. Never expose RDP, VNC, or management UIs to the public internet.
      </p>

      <div className="widget-grid">
        <div className="widget-field">
          <label className="widget-label">What do you need?</label>
          <select
            className="widget-select"
            value={need}
            onChange={(e) => setNeed(e.target.value as Need)}
          >
            <option value="terminal">Terminal / command line only</option>
            <option value="desktop">Full graphical desktop</option>
            <option value="browser-only">Access without installing software</option>
            <option value="low-latency">Interactive graphical work (lowest latency)</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Host operating system</label>
          <select
            className="widget-select"
            value={host}
            onChange={(e) => setHost(e.target.value as HostOs)}
          >
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="mixed">Mixed / not sure</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Can users install software?</label>
          <select
            className="widget-select"
            value={install}
            onChange={(e) => setInstall(e.target.value as ClientInstall)}
          >
            <option value="yes">Yes, client installation is OK</option>
            <option value="no">No, browser-only access</option>
          </select>
        </div>
      </div>

      <div className="widget-result">
        <div className="result-badge" style={{ color: result.color }}>
          <result.icon className="result-icon" size={18} />
          {result.name} · {result.label}
        </div>
        <div className="result-description">{result.description}</div>
        <div className="result-steps">
          <strong className="steps-title">Setup steps:</strong>
          <ol className="steps-list">
            {result.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
        {result.warning && (
          <div className="widget-warning">
            <AlertTriangle size={14} className="warning-icon" />
            <span>{result.warning}</span>
          </div>
        )}
        <p className="widget-note">
          > Principle: connect to the private VPN first, then use SSH or a remote display protocol over the tunnel. Never forward
          RDP 3389, VNC 5900+, Proxmox 8006, or PostgreSQL 5432 directly from a public router.
        </p>
      </div>
    </section>
  );
}
