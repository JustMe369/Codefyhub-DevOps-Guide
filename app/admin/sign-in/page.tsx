import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignInCard } from "@/components/admin/sign-in-card";
import { getAdminIdentity } from "@/lib/admin/authz";

export default async function AdminSignInPage() {
  if (await getAdminIdentity(await headers())) redirect("/admin");
  const passwordConfigured = Boolean(
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.ADMIN_EMAILS,
  );
  const githubConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return <SignInCard passwordConfigured={passwordConfigured} githubConfigured={githubConfigured} defaultEmail={process.env.ADMIN_BOOTSTRAP_EMAIL ?? ""} />;
}
