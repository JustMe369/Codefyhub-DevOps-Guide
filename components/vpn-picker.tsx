"use client";

import { useState } from "react";
import { Network, ShieldCheck, AlertTriangle } from "lucide-react";

type Environment = "personal" | "corporate" | "restricted";
type DeviceCount = "1-5" | "6-20" | "20+";
type Priority = "speed" | "stealth" | "simplicity";

interface VpnResult {
  name: string;
  label: string;
  description: string;
  setup: string;
  ports: string;
  icon: React.ElementType;
  color: string;
  note?: string;
}

const VPN_TABLE: Record<string, VpnResult> = {
  wireguard: {
    name: "WireGuard",
    label: "Modern, fast, simple",
    description:
      "Compact VPN protocol using public-key cryptography. Small codebase, fast handshakes, roaming support. Best general-purpose choice.",
    setup: "Install WireGuard on server and clients, generate key pairs, exchange public keys, configure allowed IPs.",
    ports: "UDP 51820",
    icon: Network,
    color: "var(--accent)",
  },
  amneziawg: {
    name: "AmneziaWG",
    label: "WireGuard with obfuscation",
    description:
      "WireGuard fork that scrambles packet headers to defeat deep packet inspection (DPI). Use when WireGuard is blocked or throttled.",
    setup: "Deploy AmneziaWG server, install Amnezia client apps, configure obfuscation parameters (Junk, MTU, etc.).",
    ports: "UDP (configurable, obfuscated)",
    icon: ShieldCheck,
    color: "var(--accent-2)",
    note: "Recommended for regions where WireGuard is actively blocked.",
  },
  tailscale: {
    name: "Tailscale",
    label: "Zero-config mesh VPN",
    description:
      "WireGuard-based mesh network with NAT traversal. No public IPs, no port forwarding, automatic key rotation. Free for personal use.",
    setup: "Install Tailscale on every device, run `tailscale up`, authenticate via web, approve devices in admin console.",
    ports: "None (NAT traversal via DERP relay)",
    icon: ShieldCheck,
    color: "var(--accent)",
    note: "Recommended for beginners and home/lab networks.",
  },
  zerotier: {
    name: "ZeroTier",
    label: "Managed mesh VPN",
    description:
      "Ethernet-over-VPN mesh with central management. Good for hybrid networks and devices behind strict NAT.",
    setup: "Create ZeroTier account, install client, join network ID, authorize devices in web UI.",
    ports: "None (NAT traversal)",
    icon: Network,
    color: "var(--muted)",
  },
};

function recommend(env: Environment, devices: DeviceCount, priority: Priority): VpnResult {
  if (priority === "stealth" || env === "restricted") return VPN_TABLE["amneziawg"];
  if (env === "personal" || priority === "simplicity") return VPN_TABLE["tailscale"];
  if (devices === "20+" && priority === "speed") return VPN_TABLE["wireguard"];
  return VPN_TABLE["wireguard"];
}

export function VpnPicker() {
  const [env, setEnv] = useState<Environment>("personal");
  const [devices, setDevices] = useState<DeviceCount>("1-5");
  const [priority, setPriority] = useState<Priority>("simplicity");
  const result = recommend(env, devices, priority);

  return (
    <section className="widget-card">
      <div className="widget-header">
        <Network className="widget-icon" />
        <h3 className="widget-title">VPN Protocol Picker</h3>
      </div>
      <p className="widget-subtitle">
        Choose a VPN by environment, device count, and priority. Connect to the private VPN first, then use SSH or remote desktop over the tunnel.
      </p>

      <div className="widget-grid">
        <div className="widget-field">
          <label className="widget-label">Environment</label>
          <select
            className="widget-select"
            value={env}
            onChange={(e) => setEnv(e.target.value as Environment)}
          >
            <option value="personal">Personal / home lab</option>
            <option value="corporate">Corporate / team</option>
            <option value="restricted">Restricted network (DPI / blocking)</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Device count</label>
          <select
            className="widget-select"
            value={devices}
            onChange={(e) => setDevices(e.target.value as DeviceCount)}
          >
            <option value="1-5">1–5 devices</option>
            <option value="6-20">6–20 devices</option>
            <option value="20+">20+ devices</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Priority</label>
          <select
            className="widget-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="simplicity">Easiest setup</option>
            <option value="speed">Maximum speed</option>
            <option value="stealth">Evade blocking / DPI</option>
          </select>
        </div>
      </div>

      <div className="widget-result">
        <div className="result-badge" style={{ color: result.color }}>
          <result.icon className="result-icon" size={18} />
          {result.name} · {result.label}
        </div>
        <div className="result-table">
          <div className="result-row">
            <span className="result-key">Description</span>
            <span className="result-value">{result.description}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Setup</span>
            <span className="result-value">{result.setup}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Ports</span>
            <span className="result-value">{result.ports}</span>
          </div>
        </div>
        {result.note && (
          <div className="widget-warning">
            <AlertTriangle size={14} className="warning-icon" />
            <span>{result.note}</span>
          </div>
        )}
        <p className="widget-note">
          Safety principle: never expose management UIs (Proxmox 8006, RDP 3389, PostgreSQL 5432) directly to the internet.
          Always connect through the VPN first.
        </p>
      </div>
    </section>
  );
}
