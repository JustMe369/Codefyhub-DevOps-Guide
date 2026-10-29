import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { listAvailableCompanies } from "@/lib/admin/authz";
import { getPortalIdentity } from "@/lib/portal/knowledge";

export default async function PortalMemberLayout({ children }: { children: React.ReactNode }) {
  const identity = await getPortalIdentity(await headers());
  if (!identity) redirect("/portal/sign-in");
  const companies = await listAvailableCompanies(identity);
  return <PortalShell identity={identity} companies={companies}>{children}</PortalShell>;
}
