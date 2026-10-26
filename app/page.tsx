import Link from "next/link";
import { ArrowRight, DatabaseBackup, Gauge, ShieldCheck, Terminal, Server, HardDrive, Network, BadgeCheck, Compass, Boxes, GitBranch, Database, Cloud, Workflow, BrainCircuit } from "lucide-react";
import { prisma } from "@/lib/prisma";

const iconMap = { Compass, HardDrive, Server, Shield: ShieldCheck, Terminal, Network, BadgeCheck, Boxes, GitBranch, Database, Cloud, Workflow };

export default async function HomePage() {
  const sections = await prisma.section.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: true } } }
  });

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow">Operations handbook · 2026 edition</div>
            <h1>Build infrastructure you can <span>recover.</span></h1>
            <p className="hero-copy">A practical field guide from physical disks to governed delivery platforms. Every layer is explained as a decision, a procedure, and a validation—not a collection of commands to paste blindly.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/guides/start-here">Start the guide <ArrowRight size={16} /></Link>
              <Link className="button" href="/exam"><BrainCircuit size={16} /> Test your knowledge</Link>
              <Link className="button" href="/checklist">Review production readiness</Link>
            </div>
          </div>
          <div className="architecture" aria-label="Reference architecture overview">
            <div className="architecture-head"><span>Reference architecture</span><span>{sections.length} disciplines</span></div>
            <div className="architecture-flow">
              {[
                ["01", "Physical storage", "RAID · ZFS · Backup"],
                ["02", "Virtualization", "Proxmox · KVM · LXC"],
                ["03", "Guest platform", "Ubuntu LTS · Cloud-Init"],
                ["04", "Private access", "WireGuard · AmneziaWG"],
                ["05", "Developer workspace", "SSH · Containers · IaC"]
              ].map(([i, title, detail]) => <div className="architecture-node" key={i}><span className="node-index">{i}</span><strong>{title}</strong><span>{detail}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block shell">
        <div className="section-heading">
          <div><div className="eyebrow">Guided sequence</div><h2>From bare metal to operating discipline</h2></div>
          <p>Follow the path in order for a new platform, or jump directly to the layer you are reviewing.</p>
        </div>
        <div className="journey-grid">
          {sections.map((section) => {
            const Icon = iconMap[section.icon as keyof typeof iconMap] ?? Server;
            return (
              <Link className="journey-card" href={`/guides/${section.slug}`} key={section.id}>
                <div className="journey-num">{String(section.order).padStart(2, "0")} · {section._count.articles} modules</div>
                <h3>{section.title}</h3>
                <p>{section.summary}</p>
                <Icon size={20} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block shell">
        <div className="section-heading"><div><div className="eyebrow">How to use this guide</div><h2>Make every change defensible</h2></div></div>
        <div className="principles">
          <article className="principle"><ShieldCheck size={24} /><h3>Risk before syntax</h3><p>Destructive operations are clearly marked, with prerequisites, verification, and recovery context before any command.</p></article>
          <article className="principle"><Gauge size={24} /><h3>Validate each layer</h3><p>Success means health checks, routes, restores, and operational evidence—not simply a service that started once.</p></article>
          <article className="principle"><DatabaseBackup size={24} /><h3>Recovery is designed</h3><p>RAID, snapshots, backups, and high availability solve different problems. The guide keeps those boundaries explicit.</p></article>
        </div>
      </section>
    </>
  );
}
