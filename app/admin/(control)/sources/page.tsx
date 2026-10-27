import { SourceManager } from "@/components/admin/source-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminSourcesPage() {
  const sources = await prisma.source.findMany({ include: { _count: { select: { articleSources: true } } }, orderBy: [{ organization: "asc" }, { title: "asc" }] });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Evidence management</div><h1>Sources</h1><p>Manage the authorities that support published technical claims.</p></div></header><SourceManager initialSources={sources.map((source) => ({ ...source, lastVerifiedAt: source.lastVerifiedAt.toISOString() }))} /></main>;
}
