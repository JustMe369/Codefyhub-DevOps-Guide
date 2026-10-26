"use client";

import { useState } from "react";
import { HardDrive, ShieldCheck, Clock, Database, AlertTriangle } from "lucide-react";

type DiskCount = "2" | "3" | "4" | "6+";
type Workload = "vm" | "archive" | "cache" | "database";
type RebuildBudget = "fast" | "slow-ok";

interface RaidResult {
  level: string;
  label: string;
  minDisks: number;
  usable: string;
  tolerance: string;
  bestFit: string;
  icon: React.ElementType;
  color: string;
  warning?: string;
}

const RAID_TABLE: Record<string, RaidResult> = {
  "0": {
    level: "RAID 0",
    label: "Striping",
    minDisks: 2,
    usable: "100%",
    tolerance: "None",
    bestFit: "Disposable cache only",
    icon: Database,
    color: "var(--danger)",
    warning: "No fault tolerance — one disk failure loses everything.",
  },
  "1": {
    level: "RAID 1",
    label: "Mirroring",
    minDisks: 2,
    usable: "50%",
    tolerance: "One disk",
    bestFit: "Boot and small reliable volumes",
    icon: ShieldCheck,
    color: "var(--accent)",
  },
  "5": {
    level: "RAID 5",
    label: "Striping + distributed parity",
    minDisks: 3,
    usable: "N−1 disks",
    tolerance: "One disk",
    bestFit: "Capacity-focused, moderate workloads",
    icon: Database,
    color: "var(--accent-2)",
  },
  "6": {
    level: "RAID 6",
    label: "Striping + double parity",
    minDisks: 4,
    usable: "N−2 disks",
    tolerance: "Two disks",
    bestFit: "Large arrays and archive targets",
    icon: ShieldCheck,
    color: "var(--accent)",
  },
  "10": {
    level: "RAID 10",
    label: "Mirrored stripes",
    minDisks: 4,
    usable: "50%",
    tolerance: "One per mirror pair",
    bestFit: "VM and database random I/O",
    icon: HardDrive,
    color: "var(--accent)",
  },
};

function recommend(disks: DiskCount, workload: Workload, rebuild: RebuildBudget): RaidResult {
  const diskNum = disks === "6+" ? 6 : disks === "4" ? 4 : disks === "3" ? 3 : 2;

  // Decision logic
  if (workload === "cache") return RAID_TABLE["0"];
  if (workload === "database" && diskNum >= 4 && rebuild === "fast") return RAID_TABLE["10"];
  if (workload === "vm" && diskNum >= 4 && rebuild === "fast") return RAID_TABLE["10"];
  if (workload === "archive" && diskNum >= 4) return RAID_TABLE["6"];
  if (workload === "archive" && diskNum === 3) return RAID_TABLE["5"];
  if (workload === "database" && diskNum === 3) return RAID_TABLE["5"];
  if (workload === "vm" && diskNum === 3) return RAID_TABLE["5"];
  if (diskNum >= 4) return RAID_TABLE["6"];
  if (diskNum === 3) return RAID_TABLE["5"];
  return RAID_TABLE["1"];
}

export function RaidPicker() {
  const [disks, setDisks] = useState<DiskCount>("4");
  const [workload, setWorkload] = useState<Workload>("vm");
  const [rebuild, setRebuild] = useState<RebuildBudget>("fast");
  const result = recommend(disks, workload, rebuild);

  return (
    <section className="widget-card">
      <div className="widget-header">
        <HardDrive className="widget-icon" />
        <h3 className="widget-title">RAID Level Picker</h3>
      </div>
      <p className="widget-subtitle">
        Choose a RAID layout by disk count, workload, and rebuild tolerance. RAID protects uptime — it is not a backup.
      </p>

      <div className="widget-grid">
        <div className="widget-field">
          <label className="widget-label">Number of disks</label>
          <select
            className="widget-select"
            value={disks}
            onChange={(e) => setDisks(e.target.value as DiskCount)}
          >
            <option value="2">2 disks</option>
            <option value="3">3 disks</option>
            <option value="4">4 disks</option>
            <option value="6+">6 or more disks</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Primary workload</label>
          <select
            className="widget-select"
            value={workload}
            onChange={(e) => setWorkload(e.target.value as Workload)}
          >
            <option value="vm">Virtual machines (Proxmox)</option>
            <option value="database">Database / random I/O</option>
            <option value="archive">Archive / sequential capacity</option>
            <option value="cache">Disposable cache only</option>
          </select>
        </div>

        <div className="widget-field">
          <label className="widget-label">Rebuild time tolerance</label>
          <select
            className="widget-select"
            value={rebuild}
            onChange={(e) => setRebuild(e.target.value as RebuildBudget)}
          >
            <option value="fast">Fast rebuild preferred</option>
            <option value="slow-ok">Slower rebuild acceptable</option>
          </select>
        </div>
      </div>

      <div className="widget-result">
        <div className="result-badge" style={{ color: result.color }}>
          <result.icon className="result-icon" size={18} />
          {result.level} · {result.label}
        </div>
        <div className="result-table">
          <div className="result-row">
            <span className="result-key">Minimum disks</span>
            <span className="result-value">{result.minDisks}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Usable capacity</span>
            <span className="result-value">{result.usable}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Failure tolerance</span>
            <span className="result-value">{result.tolerance}</span>
          </div>
          <div className="result-row">
            <span className="result-key">Best fit</span>
            <span className="result-value">{result.bestFit}</span>
          </div>
        </div>
        {result.warning && (
          <div className="widget-warning">
            <AlertTriangle size={14} className="warning-icon" />
            <span>{result.warning}</span>
          </div>
        )}
        <p className="widget-note">
          Decision rule: there is no universal best RAID. For busy VM storage, mirrors or RAID 10 usually provide predictable
          latency and simpler rebuild behavior. For large sequential capacity, double parity may be more important than write speed.
        </p>
      </div>
    </section>
  );
}
