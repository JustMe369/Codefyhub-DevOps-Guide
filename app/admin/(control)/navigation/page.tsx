import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NavigationManager } from "@/components/admin/navigation-manager";
import { requireAdminIdentity } from "@/lib/admin/authz";
import { getHeaderMenuItems } from "@/lib/site-navigation-data";

export default async function HeaderNavigationPage() {
  const actor = await requireAdminIdentity(await headers(), "structure.manage");
  if (!actor.isPlatformAdmin) notFound();
  const items = await getHeaderMenuItems();
  return <main className="admin-page">
    <header className="admin-page-header"><div><div className="eyebrow">Public experience</div><h1>Header navigation</h1><p>Shape the primary menu without changing code. Reorder links, hide seasonal destinations, and feature the most important action.</p></div></header>
    <NavigationManager initialItems={items} />
  </main>;
}
