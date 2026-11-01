"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpenText, CircleHelp, Home, LogOut, ShieldCheck, Wrench } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type PortalIdentity = { name: string; companyId: string; companyName: string; hasCompanyLogo: boolean; roleName: string };

const navigation = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/knowledge", label: "All knowledge", icon: BookOpenText },
  { href: "/portal/knowledge?type=FAQ", label: "Questions & answers", icon: CircleHelp, type: "FAQ" },
  { href: "/portal/knowledge?type=ISSUE_SOLUTION", label: "Issue solutions", icon: Wrench, type: "ISSUE_SOLUTION" },
];

export function PortalShell({ identity, children }: { identity: PortalIdentity; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedType = searchParams.get("type");

  async function signOut() {
    await authClient.signOut();
    router.replace("/portal/sign-in");
    router.refresh();
  }

  return <div className="portal-shell">
    <header className="portal-header">
      <div className="portal-header-row">
        <Link href="/portal" className="portal-brand" aria-label="Codefyhub Knowledge Bank home">
          <span className="portal-brand-mark">
            {identity.hasCompanyLogo ? (
              <Image
                className="portal-brand-logo"
                src={`/api/portal/company-logo?companyId=${encodeURIComponent(identity.companyId)}`}
                alt={`${identity.companyName} logo`}
                width={38}
                height={38}
                unoptimized
              />
            ) : (
              <ShieldCheck size={18} aria-hidden="true" />
            )}
          </span>
          <span className="portal-brand-copy">
            <span className="portal-brand-name">Codefyhub Knowledge Bank</span>
            <small className="portal-brand-sub">{identity.companyName}</small>
          </span>
        </Link>

        <nav className="portal-nav" aria-label="Main">
          {navigation.map(({ href, label, icon: Icon, type }) => {
            const active = type
              ? pathname === "/portal/knowledge" && selectedType === type
              : href === "/portal/knowledge"
                ? pathname === href && !selectedType
                : pathname === href;
            return (
              <Link
                href={href}
                className={`portal-nav-link${active ? " active" : ""}`}
                key={href}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="portal-user" title={identity.name}>
          <span className="portal-avatar">
            {identity.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <span className="portal-user-info">
            <span className="portal-user-name">{identity.name}</span>
            <span className="portal-user-role">{identity.roleName}</span>
          </span>
          <button type="button" className="portal-user-btn" onClick={signOut}>
            <LogOut size={14} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
    <div className="portal-content">{children}</div>
  </div>;
}
