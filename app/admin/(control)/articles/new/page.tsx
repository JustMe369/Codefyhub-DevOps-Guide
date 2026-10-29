import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { KnowledgeCreator } from "@/components/admin/knowledge-creator";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

const knowledgeTypes = ["FAQ", "ISSUE_SOLUTION", "POLICY"] as const;

export default async function NewKnowledgePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const actor = await requireAdminIdentity(await headers(), "content.create");
  const params = await searchParams;
  const initialType = knowledgeTypes.includes(params.type as typeof knowledgeTypes[number]) ? params.type as typeof knowledgeTypes[number] : "FAQ";
  const sections = await prisma.section.findMany({
    where: { companyId: actor.companyId, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
    orderBy: { order: "asc" },
  });
  return <main className="admin-page">
    <header className="admin-page-header"><div><Link href="/admin/articles" className="admin-back"><ArrowLeft size={15} /> Articles</Link><div className="eyebrow">{actor.companyName} knowledge</div><h1>New knowledge</h1><p>Create a workflow, company answer, issue solution, or policy from a governed template.</p></div></header>
    <KnowledgeCreator sections={sections} initialType={initialType} />
  </main>;
}
