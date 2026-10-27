import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignInCard } from "@/components/admin/sign-in-card";
import { getAdminIdentity } from "@/lib/admin/authz";

export default async function AdminSignInPage() {
  if (await getAdminIdentity(await headers())) redirect("/admin");
  const configured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.ADMIN_EMAILS);
  return <SignInCard configured={configured} />;
}
