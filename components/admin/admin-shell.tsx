"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, FolderTree, Gauge, LibraryBig, LogOut, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/articles", label: "Articles", icon: BookOpenText },
  { href: "/admin/sources", label: "Sources", icon: LibraryBig },
  { href: "/admin/taxonomy", label: "Structure", icon: FolderTree },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/admin/sign-in");
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand"><ShieldCheck size={20} /> Control plane</Link>
        <nav aria-label="Administration">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "active" : ""}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span>Signed in as {name}</span>
          <button type="button" onClick={signOut}><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      <div className="admin-content">{children}</div>
    </div>
  );
}
