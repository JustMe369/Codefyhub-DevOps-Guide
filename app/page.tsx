import Link from "next/link";
import { ArrowRight, DatabaseBackup, Gauge, ShieldCheck, Terminal, Server, HardDrive, Network, BadgeCheck, Compass, Boxes, GitBranch, Database, Cloud, Workflow, BrainCircuit, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";

const iconMap = { Compass, HardDrive, Server, Shield: ShieldCheck, Terminal, Network, BadgeCheck, Boxes, GitBranch, Database, Cloud, Workflow };

export default async function HomePage() {
  const [sections, recentArticles] = await Promise.all([prisma.section.findMany({
    where: { status: "PUBLISHED", company: { isPublic: true, status: "ACTIVE" }, articles: { some: { status: "PUBLISHED", reviewStatus: "APPROVED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } },
    orderBy: { order: "asc" },
    include: { _count: { select: { articles: { where: { status: "PUBLISHED", reviewStatus: "APPROVED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } } } }
  }), prisma.article.findMany({ where: { status: "PUBLISHED", reviewStatus: "APPROVED", visibility: "PUBLIC", contentType: { not: "WORKFLOW" }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], company: { isPublic: true, status: "ACTIVE" } }, orderBy: { updatedAt: "desc" }, take: 4, include: { section: true } })]);

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow">Operations handbook · 2026 edition</div>
            <h1>Build infrastructure you can <span>recover.</span></h1>
            <p className="hero-copy">A practical field guide from physical disks to governed delivery platforms. Every layer is explained as a decision, a procedure, and a validation—not a collection of commands to paste blindly.</p>
            <form className="hero-search" action="/search" role="search"><Search aria-hidden="true" size={19} /><label className="sr-only" htmlFor="hero-search">Search documentation</label><input id="hero-search" name="q" type="search" placeholder="Search a command, error, product, or scenario…" /><button type="submit">Search</button></form>
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

      <section className="knowledge-lanes shell" aria-labelledby="knowledge-lanes-title">
        <div><div className="eyebrow">Task entry points</div><h2 id="knowledge-lanes-title">Move from question to evidence</h2></div>
        <div className="knowledge-lane-grid">
          <Link href="/search?type=RUNBOOK&q=recovery"><ShieldCheck size={20} /><strong>Incident runbooks</strong><span>Diagnose symptoms before changing state.</span></Link>
          <Link href="/configurations"><Terminal size={20} /><strong>Configurations</strong><span>Download reviewed artifacts with rollback steps.</span></Link>
          <Link href="/guides/start-here/learning-path-lab"><Compass size={20} /><strong>Learning paths</strong><span>Build prerequisite knowledge in sequence.</span></Link>
          <Link href="/search?q=mdadm"><HardDrive size={20} /><strong>Command answers</strong><span>Find exact commands with operational context.</span></Link>
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
        <div className="section-heading"><div><div className="eyebrow">Repository metadata</div><h2>Recently updated</h2></div><p>Derived from published article records—never from invented activity statistics.</p></div>
        <div className="recent-grid">{recentArticles.map((article) => <Link href={`/guides/${article.section.slug}/${article.slug}`} key={article.id}><span>{article.section.title} · {article.contentType.toLowerCase().replaceAll("_", " ")}</span><strong>{article.title}</strong><time dateTime={article.updatedAt.toISOString()}>{article.updatedAt.toISOString().slice(0, 10)}</time></Link>)}</div>
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
