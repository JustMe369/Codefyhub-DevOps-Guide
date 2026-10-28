import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminIdentity, listAvailableCompanies } from "@/lib/admin/authz";

export default async function AdminControlLayout({ children }: { children: React.ReactNode }) {
  const identity = await getAdminIdentity(await headers());
  if (!identity) redirect("/admin/sign-in");
  const companies = await listAvailableCompanies(identity);
  return <AdminShell identity={identity} companies={companies}>{children}</AdminShell>;
}
