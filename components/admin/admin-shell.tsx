"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, Building2, FilePlus2, FolderTree, Gauge, LibraryBig, LogOut, Search, ScrollText, ShieldCheck, Sparkles, UserCog, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { AdminIdentity } from "@/lib/admin/authz";

const navigation = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/articles/new", label: "New knowledge", icon: FilePlus2, permission: "content.create" },
  { href: "/admin/articles", label: "Articles", icon: BookOpenText, permission: "content.view" },
  { href: "/admin/sources", label: "Sources", icon: LibraryBig, permission: "sources.manage" },
  { href: "/admin/taxonomy", label: "Structure", icon: FolderTree, permission: "structure.manage" },
  { href: "/admin/studio", label: "Studio", icon: Sparkles, permission: "content.view" },
  { href: "/admin/search", label: "Knowledge search", icon: Search, permission: "content.view" },
  { href: "/admin/knowledge-gaps", label: "Knowledge gaps", icon: LibraryBig, permission: "content.review" },
  { href: "/admin/members", label: "Members", icon: Users, permission: "members.view" },
  { href: "/admin/roles", label: "Roles", icon: UserCog, permission: "roles.view" },
  { href: "/admin/audit", label: "Audit", icon: ScrollText, permission: "audit.view" },
];

type CompanyOption = { id: string; name: string; slug: string; isPublic: boolean };

export function AdminShell({ identity, companies, children }: { identity: AdminIdentity; companies: CompanyOption[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/sign-in");
    router.refresh();
  }

  async function switchCompany(companyId: string) {
    const response = await fetch("/api/admin/context", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId }) });
    if (response.ok) router.refresh();
  }

  const visibleNavigation = navigation.filter((item) => !item.permission || identity.permissions.includes(item.permission));

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><ShieldCheck size={20} /> Control plane</Link>
        <label className="admin-company-switcher">
          <span>Workspace</span>
          <select value={identity.companyId} onChange={(event) => switchCompany(event.target.value)} aria-label="Active company">
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
        </label>
        <nav aria-label="Administration">
          {visibleNavigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "active" : ""}>
              <Icon size={17} /> {label}
            </Link>
          ))}
          {identity.isPlatformAdmin && <><Link href="/admin/users" className={pathname.startsWith("/admin/users") ? "active" : ""}><Users size={17} /> Platform users</Link><Link href="/admin/companies" className={pathname.startsWith("/admin/companies") ? "active" : ""}><Building2 size={17} /> Companies</Link></>}
        </nav>
        <div className="admin-sidebar-footer">
          <span><strong>{identity.name}</strong><br />{identity.roleName}</span>
          <button type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
