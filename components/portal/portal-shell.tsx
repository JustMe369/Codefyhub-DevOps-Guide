"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, Building2, CircleHelp, GitBranch, Home, LogOut, Search, ShieldCheck, Wrench } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type PortalIdentity = { name: string; companyId: string; companyName: string; roleName: string };
type CompanyOption = { id: string; name: string; slug: string; isPublic: boolean };

const navigation = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/knowledge", label: "All knowledge", icon: BookOpenText },
  { href: "/portal/knowledge?type=WORKFLOW", label: "Workflows", icon: GitBranch, type: "WORKFLOW" },
  { href: "/portal/knowledge?type=FAQ", label: "Questions & answers", icon: CircleHelp, type: "FAQ" },
  { href: "/portal/knowledge?type=ISSUE_SOLUTION", label: "Issue solutions", icon: Wrench, type: "ISSUE_SOLUTION" },
];

export function PortalShell({ identity, companies, children }: { identity: PortalIdentity; companies: CompanyOption[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedType = searchParams.get("type");

  async function signOut() {
    await authClient.signOut();
    router.replace("/portal/sign-in");
    router.refresh();
  }

  async function switchCompany(companyId: string) {
    const response = await fetch("/api/portal/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    if (response.ok) {
      router.replace("/portal");
      router.refresh();
    }
  }

  return <div className="portal-shell">
    <header className="portal-header">
      <Link href="/portal" className="portal-brand"><ShieldCheck size={22} /><span>Codefyhub Knowledge Bank<small>{identity.companyName}</small></span></Link>
      <label className="portal-company-switcher"><Building2 size={16} /><span className="sr-only">Active company</span><select value={identity.companyId} onChange={(event) => switchCompany(event.target.value)} aria-label="Active company">{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select></label>
      <div className="portal-user"><span><strong>{identity.name}</strong><small>{identity.roleName}</small></span><button type="button" onClick={signOut}><LogOut size={16} /> Sign out</button></div>
    </header>
    <aside className="portal-sidebar">
      <nav aria-label="Company knowledge">
        {navigation.map(({ href, label, icon: Icon, type }) => {
          const active = type ? pathname === "/portal/knowledge" && selectedType === type : href === "/portal/knowledge" ? pathname === href && !selectedType : pathname === href;
          return <Link href={href} className={active ? "active" : ""} key={href}><Icon size={18} />{label}</Link>;
        })}
      </nav>
      <form action="/portal/knowledge" className="portal-side-search"><Search size={16} /><label className="sr-only" htmlFor="portal-side-query">Search company knowledge</label><input id="portal-side-query" name="q" type="search" placeholder="Search your bank…" minLength={2} /></form>
      <p>Your access is isolated to <strong>{identity.companyName}</strong>. Only approved, current knowledge is shown.</p>
    </aside>
    <div className="portal-content">{children}</div>
  </div>;
}
