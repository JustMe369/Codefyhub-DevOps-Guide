import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CompanyManager } from "@/components/admin/company-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const actor = await requireAdminIdentity(await headers());
  if (!actor.isPlatformAdmin) notFound();
  const companies = await prisma.company.findMany({ include: { _count: { select: { memberships: true, articles: true, sections: true } } }, orderBy: { name: "asc" } });
  return <main className="admin-page"><header className="admin-page-header"><div><div className="eyebrow">Platform administration</div><h1>Companies</h1><p>Provision isolated information banks without sharing content, users, or search indexes.</p></div></header><CompanyManager initialCompanies={companies} /></main>;
}
