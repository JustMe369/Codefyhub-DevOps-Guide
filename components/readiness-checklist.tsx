"use client";

import { useEffect, useState } from "react";
import { indexListSchema, readStored } from "@/lib/client-storage";

const items = [
  ["Management isolation", "Proxmox UI and SSH are restricted to an administrative network or private VPN."],
  ["Named administrators", "Daily administration uses named accounts, least privilege, MFA, and SSH keys."],
  ["Storage health", "SMART monitoring, array alerts, ZFS scrubs, and capacity thresholds reach an owned alert channel."],
  ["Independent backups", "Backups are separate from production storage and include an offsite or immutable copy."],
  ["Restore evidence", "A representative VM or service has been restored and validated within the current quarter."],
  ["RPO and RTO", "Recovery point and recovery time objectives are documented for every critical service."],
  ["Network separation", "Management, guest, storage, migration, and backup traffic are segmented as required."],
  ["Patched baseline", "Host firmware, Proxmox, guests, and network services follow an owned patch cadence."],
  ["Monitoring", "Node, storage, service, certificate, backup, and capacity alerts have tested escalation routes."],
  ["Recovery access", "Console or out-of-band access works when the primary network or VPN is unavailable."],
  ["Runbooks", "Disk failure, node loss, VPN outage, credential compromise, and restore procedures are current."],
  ["Change review", "Infrastructure changes record owner, purpose, risk, validation, and rollback."],
  ["Repository governance", "Rulesets require review, named checks, resolved conversations, and audited bypass."],
  ["CI supply chain", "Actions are SHA-pinned, permissions are minimal, OIDC replaces cloud secrets, and artifacts carry provenance."],
  ["Data authorization", "Supabase grants and RLS policies are tested for allow and deny cases across every exposed object."],
  ["Environment isolation", "Development, preview, and production use separate credentials, data, and protected release paths."],
  ["Infrastructure as code", "Infrastructure and host configuration are reviewed, reproducible, drift-monitored, and recoverable."],
  ["Reliability objectives", "User-centered SLIs, SLOs, error budgets, and actionable alert ownership are documented." ]
];

export function ReadinessChecklist() {
  const key = "devops-guide:readiness";
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(readStored(key, indexListSchema, []).filter((index) => index < items.length)), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function toggle(index: number) {
    const next = checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index];
    setChecked(next);
    localStorage.setItem(key, JSON.stringify(next));
  }
  function printChecklist() { window.print(); }
  const percentage = Math.round((checked.length / items.length) * 100);
  return (
    <>
      <div className="progress-bar" role="progressbar" aria-label="Readiness review completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
      <div className="checklist-summary"><div className="progress-copy">{checked.length} of {items.length} controls reviewed · {percentage}%</div><button className="button checklist-print" onClick={printChecklist} type="button">Print / export PDF</button></div>
      <div className="checklist">
        {items.map(([title, description], index) => (
          <label className="check-item" key={title}>
            <input type="checkbox" checked={checked.includes(index)} onChange={() => toggle(index)} />
            <span><strong>{title}</strong><span>{description}</span></span>
          </label>
        ))}
      </div>
    </>
  );
}
